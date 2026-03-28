import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import path from "node:path";
import readline from "node:readline";

type PendingRequest = {
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
};

type RpcResponse = {
  error?: string;
  id: number;
  kind: "response";
  result?: unknown;
  success: boolean;
};

type RpcEvent = {
  event: string;
  kind: "event";
  payload?: unknown;
};

export class SidecarClient extends EventEmitter {
  private child: ChildProcessWithoutNullStreams | null = null;
  private nextRequestId = 1;
  private pending = new Map<number, PendingRequest>();

  async start() {
    if (this.child) {
      return;
    }

    const sidecarPath = resolveSidecarPath();
    const sidecarDir = path.dirname(sidecarPath);
    const child = spawn(sidecarPath, [], {
      cwd: sidecarDir,
      env: {
        ...process.env,
        CLEANROOM_RESOURCE_DIR: resolveResourceDir(),
        PATH: extendPath(process.env.PATH, sidecarDir),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.on("error", (error) => {
      this.child = null;
      this.rejectPending(error);
      this.emit("sidecar-error", `Sidecar failed to start: ${error.message}`);
    });

    child.stderr.on("data", (chunk) => {
      const message = chunk.toString().trim();
      if (message) {
        this.emit("sidecar-error", message);
      }
    });

    child.on("exit", (code, signal) => {
      this.child = null;
      this.rejectPending(
        new Error(
          `Cleanroom sidecar exited unexpectedly (${signal ?? code ?? "unknown"}).`,
        ),
      );
      this.emit("sidecar-exit", { code, signal });
    });

    const rl = readline.createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      if (!line.trim()) {
        return;
      }

      try {
        const payload = JSON.parse(line) as RpcResponse | RpcEvent;
        if (payload.kind === "response") {
          const pending = this.pending.get(payload.id);
          if (!pending) {
            return;
          }

          this.pending.delete(payload.id);
          if (payload.success) {
            pending.resolve(payload.result);
          } else {
            pending.reject(new Error(payload.error ?? "Unknown sidecar error"));
          }
          return;
        }

        this.emit(payload.event, payload.payload);
      } catch (error) {
        this.emit("sidecar-error", String(error));
      }
    });

    this.child = child;
  }

  async stop() {
    if (!this.child) {
      return;
    }

    this.child.kill();
    this.child = null;
  }

  async invoke<T>(method: string, params?: Record<string, unknown>) {
    await this.start();
    if (!this.child) {
      throw new Error("Cleanroom sidecar is not running.");
    }

    const id = this.nextRequestId++;
    const payload = JSON.stringify({
      id,
      method,
      params: params ?? {},
    });

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        reject,
        resolve: (value) => resolve(value as T),
      });
      this.child?.stdin.write(`${payload}\n`, (error) => {
        if (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  private rejectPending(error: Error) {
    for (const [, pending] of this.pending) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function resolveSidecarPath() {
  const binaryName =
    process.platform === "win32" ? "cleanroom-sidecar.exe" : "cleanroom-sidecar";

  if (appIsPackaged()) {
    return path.join(process.resourcesPath, "sidecar", binaryName);
  }

  return path.join(
    process.cwd(),
    "src-tauri",
    "target",
    "debug",
    binaryName,
  );
}

function resolveResourceDir() {
  if (appIsPackaged()) {
    return path.join(process.resourcesPath, "resources");
  }

  return path.join(process.cwd(), "src-tauri", "resources");
}

function appIsPackaged() {
  return !process.defaultApp;
}

function extendPath(existingPath: string | undefined, entry: string) {
  if (!existingPath) {
    return entry;
  }

  const separator = process.platform === "win32" ? ";" : ":";
  return `${entry}${separator}${existingPath}`;
}
