package no.vardir.cleanroom.spike;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Base64;
import android.sun.security.x509.AlgorithmId;
import android.sun.security.x509.CertificateAlgorithmId;
import android.sun.security.x509.CertificateExtensions;
import android.sun.security.x509.CertificateIssuerName;
import android.sun.security.x509.CertificateSerialNumber;
import android.sun.security.x509.CertificateSubjectName;
import android.sun.security.x509.CertificateValidity;
import android.sun.security.x509.CertificateVersion;
import android.sun.security.x509.CertificateX509Key;
import android.sun.security.x509.KeyIdentifier;
import android.sun.security.x509.PrivateKeyUsageExtension;
import android.sun.security.x509.SubjectKeyIdentifierExtension;
import android.sun.security.x509.X500Name;
import android.sun.security.x509.X509CertImpl;
import android.sun.security.x509.X509CertInfo;

import androidx.annotation.NonNull;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Date;
import java.util.Random;

import io.github.muntashirakon.adb.AbsAdbConnectionManager;

public final class AdbConnectionManager extends AbsAdbConnectionManager {
    private static final String PREFS = "adb_identity";
    private static final String PRIVATE_KEY = "private_key";
    private static final String CERTIFICATE = "certificate";

    private final PrivateKey privateKey;
    private final Certificate certificate;

    public AdbConnectionManager(Context context) throws Exception {
        setApi(Build.VERSION.SDK_INT);

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String storedKey = prefs.getString(PRIVATE_KEY, null);
        String storedCertificate = prefs.getString(CERTIFICATE, null);

        if (storedKey != null && storedCertificate != null) {
            privateKey = KeyFactory.getInstance("RSA").generatePrivate(
                    new PKCS8EncodedKeySpec(Base64.decode(storedKey, Base64.NO_WRAP))
            );
            certificate = CertificateFactory.getInstance("X.509").generateCertificate(
                    new java.io.ByteArrayInputStream(Base64.decode(storedCertificate, Base64.NO_WRAP))
            );
            return;
        }

        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048, SecureRandom.getInstance("SHA1PRNG"));
        KeyPair pair = generator.generateKeyPair();
        privateKey = pair.getPrivate();
        certificate = createCertificate(pair.getPublic(), privateKey);

        prefs.edit()
                .putString(PRIVATE_KEY, Base64.encodeToString(privateKey.getEncoded(), Base64.NO_WRAP))
                .putString(CERTIFICATE, Base64.encodeToString(certificate.getEncoded(), Base64.NO_WRAP))
                .apply();
    }

    private static Certificate createCertificate(PublicKey publicKey, PrivateKey privateKey) throws Exception {
        String algorithm = "SHA512withRSA";
        Date notBefore = new Date(System.currentTimeMillis() - 60_000L);
        Date notAfter = new Date(System.currentTimeMillis() + 3650L * 24L * 60L * 60L * 1000L);

        CertificateExtensions extensions = new CertificateExtensions();
        extensions.set("SubjectKeyIdentifier", new SubjectKeyIdentifierExtension(
                new KeyIdentifier(publicKey).getIdentifier()
        ));
        extensions.set("PrivateKeyUsage", new PrivateKeyUsageExtension(notBefore, notAfter));

        X500Name name = new X500Name("CN=Cleanroom");
        X509CertInfo info = new X509CertInfo();
        info.set("version", new CertificateVersion(2));
        info.set("serialNumber", new CertificateSerialNumber(new Random().nextInt() & Integer.MAX_VALUE));
        info.set("algorithmID", new CertificateAlgorithmId(AlgorithmId.get(algorithm)));
        info.set("subject", new CertificateSubjectName(name));
        info.set("key", new CertificateX509Key(publicKey));
        info.set("validity", new CertificateValidity(notBefore, notAfter));
        info.set("issuer", new CertificateIssuerName(name));
        info.set("extensions", extensions);

        X509CertImpl cert = new X509CertImpl(info);
        cert.sign(privateKey, algorithm);
        return cert;
    }

    @NonNull
    @Override
    protected PrivateKey getPrivateKey() {
        return privateKey;
    }

    @NonNull
    @Override
    protected Certificate getCertificate() {
        return certificate;
    }

    @NonNull
    @Override
    protected String getDeviceName() {
        return "Cleanroom";
    }
}
