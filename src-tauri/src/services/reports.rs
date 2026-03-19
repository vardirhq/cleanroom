use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use pdfpdf::{Alignment, Color, Font, Pdf};
use time::{format_description::well_known::Rfc3339, OffsetDateTime, UtcOffset};

use crate::models::{
    package::CleanupResultRecord,
    package::ScanSummary,
    report::{CleanupSessionReport, PdfExportLanguage, PdfExportResult, ReportSummary},
};
use crate::services::settings::effective_export_directory;

pub fn load_report_summaries() -> Vec<ReportSummary> {
    let Ok(entries) = fs::read_dir(reports_dir()) else {
        return vec![];
    };

    let mut reports: Vec<_> = entries
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            let contents = fs::read_to_string(path).ok()?;
            let mut report = serde_json::from_str::<CleanupSessionReport>(&contents).ok()?;
            report.export_status = export_status_for_report(&report.id);
            Some(ReportSummary {
                id: report.id,
                device_label: report.device_label,
                summary: report.summary,
                timestamp: report.timestamp,
                export_status: report.export_status,
            })
        })
        .collect();

    reports.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));
    reports
}

pub fn load_cleanup_report(report_id: &str) -> Option<CleanupSessionReport> {
    let path = reports_dir().join(format!("{report_id}.json"));
    let contents = fs::read_to_string(path).ok()?;
    let mut report = serde_json::from_str::<CleanupSessionReport>(&contents).ok()?;
    report.export_status = export_status_for_report(report_id);
    Some(report)
}

pub fn export_cleanup_report_pdf(report_id: &str, language: PdfExportLanguage) -> PdfExportResult {
    let Some(report) = load_cleanup_report(report_id) else {
        return PdfExportResult {
            success: false,
            path: None,
            message: "Cleanup report could not be found.".to_string(),
            export_status: "Local JSON + text".to_string(),
            preview_data_url: None,
        };
    };

    let directory = reports_dir();
    if let Err(error) = fs::create_dir_all(&directory) {
        return PdfExportResult {
            success: false,
            path: None,
            message: format!("Unable to prepare the reports directory: {error}"),
            export_status: export_status_for_report(report_id),
            preview_data_url: None,
        };
    }

    let path = pdf_path_for_report(report_id, &language);
    match render_pdf_report(&report, &language, &path) {
        Ok(()) => PdfExportResult {
            success: true,
            path: Some(path.to_string_lossy().to_string()),
            message: success_message(&language),
            export_status: export_status_for_report(report_id),
            preview_data_url: load_pdf_preview_data_url(&path),
        },
        Err(error) => PdfExportResult {
            success: false,
            path: None,
            message: format!("PDF export failed: {error}"),
            export_status: export_status_for_report(report_id),
            preview_data_url: None,
        },
    }
}

pub fn write_cleanup_report(
    after_summary: ScanSummary,
    before_summary: ScanSummary,
    device_label: String,
    launcher_observations: Vec<String>,
    selected_packages: Vec<String>,
    results: Vec<CleanupResultRecord>,
) {
    let timestamp = current_timestamp();
    let id = format!("cleanup-{}", unix_millis());
    let success_count = results.iter().filter(|item| item.success).count();
    let failure_count = results.len().saturating_sub(success_count);
    let before_flagged = before_summary.flagged_count;
    let after_flagged = after_summary.flagged_count;
    let report = CleanupSessionReport {
        after_summary,
        before_summary,
        id: id.clone(),
        device_label,
        launcher_observations,
        selected_packages,
        summary: format!(
            "{success_count} removed, {failure_count} failed, flagged {before_flagged}->{after_flagged}"
        ),
        timestamp: timestamp.clone(),
        export_status: "Local JSON + text".to_string(),
        results,
    };

    let directory = reports_dir();
    if fs::create_dir_all(&directory).is_err() {
        return;
    }

    let path = directory.join(format!("{id}.json"));
    let Ok(contents) = serde_json::to_string_pretty(&report) else {
        return;
    };
    let _ = fs::write(path, contents);
    let _ = fs::write(
        directory.join(format!("{id}.txt")),
        render_text_report(&report),
    );
}

fn reports_dir() -> PathBuf {
    effective_export_directory()
}

fn pdf_path_for_report(report_id: &str, language: &PdfExportLanguage) -> PathBuf {
    reports_dir().join(format!("{report_id}-{}.pdf", language.code()))
}

fn unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or_default()
}

fn unix_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or_default()
}

fn current_timestamp() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| unix_seconds().to_string())
}

fn display_timestamp(value: &str, language: PdfExportLanguage) -> String {
    if let Ok(datetime) = OffsetDateTime::parse(value, &Rfc3339) {
        return datetime
            .to_offset(current_local_offset())
            .format(&timestamp_format(language))
            .unwrap_or_else(|_| value.to_string());
    }

    if let Ok(seconds) = value.parse::<i64>() {
        if let Ok(datetime) = OffsetDateTime::from_unix_timestamp(seconds) {
            return datetime
                .to_offset(current_local_offset())
                .format(&timestamp_format(language))
                .unwrap_or_else(|_| value.to_string());
        }
    }

    value.to_string()
}

fn current_local_offset() -> UtcOffset {
    UtcOffset::current_local_offset().unwrap_or(UtcOffset::UTC)
}

fn timestamp_format(
    language: PdfExportLanguage,
) -> Vec<time::format_description::BorrowedFormatItem<'static>> {
    match language {
        PdfExportLanguage::En => time::format_description::parse(
            "[month repr:short] [day padding:none], [year], [hour]:[minute]",
        )
        .unwrap(),
        PdfExportLanguage::No => {
            time::format_description::parse("[day].[month].[year] [hour]:[minute]").unwrap()
        }
    }
}

fn render_text_report(report: &CleanupSessionReport) -> String {
    let mut lines = vec![
        format!("Cleanroom Cleanup Report {}", report.id),
        format!(
            "Timestamp: {}",
            display_timestamp(&report.timestamp, PdfExportLanguage::En)
        ),
        format!("Device: {}", report.device_label),
        format!("Summary: {}", report.summary),
        String::new(),
        "Before scan summary:".to_string(),
        format!(
            "  scanned={} flagged={} launcherWarnings={} protected={} notificationSuspects={}",
            report.before_summary.scanned_package_count,
            report.before_summary.flagged_count,
            report.before_summary.launcher_risk_count,
            report.before_summary.protected_count,
            report.before_summary.notification_suspect_count
        ),
        "After scan summary:".to_string(),
        format!(
            "  scanned={} flagged={} launcherWarnings={} protected={} notificationSuspects={}",
            report.after_summary.scanned_package_count,
            report.after_summary.flagged_count,
            report.after_summary.launcher_risk_count,
            report.after_summary.protected_count,
            report.after_summary.notification_suspect_count
        ),
        String::new(),
        "Selected packages:".to_string(),
    ];

    for package_name in &report.selected_packages {
        lines.push(format!("  - {package_name}"));
    }

    if !report.launcher_observations.is_empty() {
        lines.push(String::new());
        lines.push("Launcher observations:".to_string());
        for note in &report.launcher_observations {
            lines.push(format!("  - {note}"));
        }
    }

    lines.push(String::new());
    lines.push("Cleanup results:".to_string());
    for result in &report.results {
        lines.push(format!(
            "  - {} [{}]: {}",
            result.package_name,
            if result.success { "success" } else { "failed" },
            result.message
        ));
        if let Some(guidance) = &result.rollback_guidance {
            lines.push(format!("    rollback: {guidance}"));
        }
    }

    lines.join("\n")
}

fn export_status_for_report(report_id: &str) -> String {
    let english = pdf_path_for_report(report_id, &PdfExportLanguage::En).exists();
    let norwegian = pdf_path_for_report(report_id, &PdfExportLanguage::No).exists();

    match (english, norwegian) {
        (true, true) => "Local JSON + text + PDF (English, Norwegian)".to_string(),
        (true, false) => "Local JSON + text + PDF (English)".to_string(),
        (false, true) => "Local JSON + text + PDF (Norwegian)".to_string(),
        (false, false) => "Local JSON + text".to_string(),
    }
}

fn success_message(language: &PdfExportLanguage) -> String {
    match language {
        PdfExportLanguage::En => "English PDF ready.".to_string(),
        PdfExportLanguage::No => "Norwegian PDF ready.".to_string(),
    }
}

fn load_pdf_preview_data_url(path: &Path) -> Option<String> {
    let bytes = fs::read(path).ok()?;
    Some(format!(
        "data:application/pdf;base64,{}",
        STANDARD.encode(bytes)
    ))
}

fn render_pdf_report(
    report: &CleanupSessionReport,
    language: &PdfExportLanguage,
    path: &Path,
) -> std::io::Result<()> {
    let copy = PdfCopy::for_language(language);
    let mut pdf = Pdf::new();
    let mut layout = PdfLayout::new(&mut pdf, report.id.as_str(), *language);

    layout.draw_document_header(&copy, report, language);
    layout.draw_section_heading(copy.overview, 140.0);
    layout.draw_summary_band(&copy, report);
    layout.draw_comparison_section(&copy, report);

    layout.draw_section_heading(copy.selected_packages, 90.0);
    layout.draw_bulleted_panel(&copy, &report.selected_packages);

    if !report.launcher_observations.is_empty() {
        layout.draw_section_heading(copy.launcher_observations, 90.0);
        let localized_observations = report
            .launcher_observations
            .iter()
            .map(|item| copy.localize_observation(item))
            .collect::<Vec<_>>();
        layout.draw_bulleted_panel(&copy, &localized_observations);
    }

    let first_result_height = report
        .results
        .first()
        .map(|result| layout.result_block_height(&copy, result) + 12.0)
        .unwrap_or(90.0);
    layout.draw_section_heading(copy.results, first_result_height);
    layout.draw_results_table(&copy, &report.results);

    pdf.write_to(&path.to_string_lossy())
}

struct PdfLayout<'a> {
    pdf: &'a mut Pdf,
    cursor_y: f64,
    language: PdfExportLanguage,
    page_number: usize,
    report_id: String,
}

struct CardFrame {
    height: f64,
    top_y: f64,
    width: f64,
    x: f64,
}

struct PdfTextStyle {
    color: Color,
    font: Font,
    font_size: f64,
    line_height: f64,
}

impl<'a> PdfLayout<'a> {
    const PAGE_HEIGHT: f64 = 842.0;
    const PAGE_WIDTH: f64 = 595.0;
    const MARGIN_X: f64 = 46.0;
    const MARGIN_Y: f64 = 44.0;
    const CONTENT_WIDTH: f64 = Self::PAGE_WIDTH - Self::MARGIN_X * 2.0;
    const FOOTER_HEIGHT: f64 = 32.0;
    const MIN_CURSOR_Y: f64 = Self::MARGIN_Y + Self::FOOTER_HEIGHT;

    fn new(pdf: &'a mut Pdf, report_id: &str, language: PdfExportLanguage) -> Self {
        let mut layout = Self {
            pdf,
            cursor_y: 0.0,
            language,
            page_number: 0,
            report_id: report_id.to_string(),
        };
        layout.start_page();
        layout
    }

    fn start_page(&mut self) {
        self.pdf.add_page(Self::PAGE_WIDTH, Self::PAGE_HEIGHT);
        self.page_number += 1;
        self.cursor_y = Self::PAGE_HEIGHT - Self::MARGIN_Y;
        self.draw_page_footer();
        self.pdf.set_color(&Color::rgb(30, 41, 59));
    }

    fn ensure_space(&mut self, required_height: f64) {
        if self.cursor_y - required_height >= Self::MIN_CURSOR_Y {
            return;
        }

        self.start_page();
    }

    fn draw_page_footer(&mut self) {
        let footer_y = Self::MARGIN_Y - 10.0;
        self.pdf.set_line_width(0.7);
        self.pdf.set_color(&Color::rgb(203, 213, 225));
        self.pdf.draw_line(
            [
                (Self::MARGIN_X, footer_y + 14.0),
                (Self::PAGE_WIDTH - Self::MARGIN_X, footer_y + 14.0),
            ]
            .into_iter(),
        );

        self.pdf.font(Font::Helvetica, 9);
        self.pdf.set_color(&Color::rgb(100, 116, 139));
        self.pdf.draw_text(
            Self::MARGIN_X,
            footer_y,
            Alignment::TopLeft,
            &self.report_id,
        );
        self.pdf.draw_text(
            Self::PAGE_WIDTH - Self::MARGIN_X,
            footer_y,
            Alignment::TopRight,
            &format!("{} {}", self.footer_page_label(), self.page_number),
        );
    }

    fn footer_page_label(&self) -> &'static str {
        match self.language {
            PdfExportLanguage::En => "Page",
            PdfExportLanguage::No => "Side",
        }
    }

    fn draw_document_header(
        &mut self,
        copy: &PdfCopy,
        report: &CleanupSessionReport,
        language: &PdfExportLanguage,
    ) {
        let block_height = 138.0;
        self.ensure_space(block_height);

        self.pdf.set_color(&Color::rgb(239, 246, 255));
        self.pdf.draw_rectangle_filled(
            Self::MARGIN_X,
            self.cursor_y - block_height,
            Self::CONTENT_WIDTH,
            block_height,
        );
        self.pdf.set_color(&Color::rgb(191, 219, 254));
        self.pdf.draw_rectangle_filled(
            Self::MARGIN_X,
            self.cursor_y - block_height,
            14.0,
            block_height,
        );

        self.pdf.font(Font::Helvetica, 10);
        self.pdf.set_color(&Color::rgb(37, 99, 235));
        self.pdf.draw_text(
            Self::MARGIN_X + 24.0,
            self.cursor_y - 18.0,
            Alignment::TopLeft,
            copy.document_label,
        );

        self.pdf.font(Font::HelveticaBold, 20);
        self.pdf.set_color(&Color::rgb(15, 23, 42));
        self.pdf.draw_text(
            Self::MARGIN_X + 24.0,
            self.cursor_y - 38.0,
            Alignment::TopLeft,
            copy.title,
        );

        self.pdf.font(Font::Helvetica, 11);
        self.pdf.set_color(&Color::rgb(71, 85, 105));
        self.pdf.draw_text(
            Self::PAGE_WIDTH - Self::MARGIN_X - 20.0,
            self.cursor_y - 18.0,
            Alignment::TopRight,
            &format!("{}: {}", copy.language_label, copy.language_name(language)),
        );
        self.pdf.draw_text(
            Self::PAGE_WIDTH - Self::MARGIN_X - 20.0,
            self.cursor_y - 38.0,
            Alignment::TopRight,
            &format!("{}: {}", copy.report_id, report.id),
        );

        let meta_top = self.cursor_y - 72.0;
        let left_width = Self::CONTENT_WIDTH - 48.0;
        self.draw_text_lines(
            Self::MARGIN_X + 24.0,
            meta_top,
            &[
                format!("{}: {}", copy.device_label, report.device_label),
                format!(
                    "{}: {}",
                    copy.timestamp,
                    display_timestamp(&report.timestamp, *language)
                ),
            ],
            PdfTextStyle {
                color: Color::rgb(51, 65, 85),
                font: Font::Helvetica,
                font_size: 11.0,
                line_height: 14.0,
            },
        );
        self.draw_text_lines(
            Self::MARGIN_X + 24.0,
            meta_top - 34.0,
            &wrap_text_to_width(&copy.localized_summary(report), left_width, 11.0),
            PdfTextStyle {
                color: Color::rgb(51, 65, 85),
                font: Font::Helvetica,
                font_size: 11.0,
                line_height: 14.0,
            },
        );

        self.cursor_y -= block_height + 18.0;
    }

    fn draw_section_heading(&mut self, heading: &str, next_block_height: f64) {
        self.ensure_space(34.0 + next_block_height);
        self.pdf.font(Font::Helvetica, 10);
        self.pdf.set_color(&Color::rgb(37, 99, 235));
        self.pdf
            .draw_text(Self::MARGIN_X, self.cursor_y, Alignment::TopLeft, heading);
        self.pdf.set_line_width(0.7);
        self.pdf.set_color(&Color::rgb(191, 219, 254));
        self.pdf.draw_line(
            [
                (Self::MARGIN_X, self.cursor_y - 16.0),
                (Self::PAGE_WIDTH - Self::MARGIN_X, self.cursor_y - 16.0),
            ]
            .into_iter(),
        );
        self.cursor_y -= 28.0;
    }

    fn draw_summary_band(&mut self, copy: &PdfCopy, report: &CleanupSessionReport) {
        let band_height = 86.0;
        self.ensure_space(band_height + 8.0);

        let column_gap = 12.0;
        let column_width = (Self::CONTENT_WIDTH - column_gap * 2.0) / 3.0;
        let metrics = [
            (
                copy.packages_removed,
                report
                    .results
                    .iter()
                    .filter(|result| result.success)
                    .count()
                    .to_string(),
            ),
            (
                copy.failed_actions,
                report
                    .results
                    .iter()
                    .filter(|result| !result.success)
                    .count()
                    .to_string(),
            ),
            (
                copy.flagged_delta,
                format!(
                    "{} to {}",
                    report.before_summary.flagged_count, report.after_summary.flagged_count
                ),
            ),
        ];

        for (index, (label, value)) in metrics.iter().enumerate() {
            let x = Self::MARGIN_X + index as f64 * (column_width + column_gap);
            self.pdf.set_color(&Color::rgb(248, 250, 252));
            self.pdf.draw_rectangle_filled(
                x,
                self.cursor_y - band_height,
                column_width,
                band_height,
            );
            self.pdf.set_line_width(0.7);
            self.pdf.set_color(&Color::rgb(226, 232, 240));
            self.pdf.draw_line(
                [
                    (x, self.cursor_y - band_height),
                    (x + column_width, self.cursor_y - band_height),
                    (x + column_width, self.cursor_y),
                    (x, self.cursor_y),
                    (x, self.cursor_y - band_height),
                ]
                .into_iter(),
            );

            self.pdf.font(Font::Helvetica, 10);
            self.pdf.set_color(&Color::rgb(100, 116, 139));
            self.pdf
                .draw_text(x + 16.0, self.cursor_y - 16.0, Alignment::TopLeft, label);
            self.pdf.font(Font::HelveticaBold, 24);
            self.pdf.set_color(&Color::rgb(15, 23, 42));
            self.pdf
                .draw_text(x + 16.0, self.cursor_y - 40.0, Alignment::TopLeft, value);
        }

        self.cursor_y -= band_height + 16.0;
    }

    fn draw_comparison_section(&mut self, copy: &PdfCopy, report: &CleanupSessionReport) {
        let card_height = 148.0;
        self.ensure_space(card_height + 8.0);

        let card_gap = 16.0;
        let card_width = (Self::CONTENT_WIDTH - card_gap) / 2.0;
        self.draw_summary_card(
            CardFrame {
                x: Self::MARGIN_X,
                top_y: self.cursor_y,
                width: card_width,
                height: card_height,
            },
            copy.before_cleanup,
            &report.before_summary,
            copy,
        );
        self.draw_summary_card(
            CardFrame {
                x: Self::MARGIN_X + card_width + card_gap,
                top_y: self.cursor_y,
                width: card_width,
                height: card_height,
            },
            copy.after_cleanup,
            &report.after_summary,
            copy,
        );

        self.cursor_y -= card_height + 18.0;
    }

    fn draw_summary_card(
        &mut self,
        frame: CardFrame,
        title: &str,
        summary: &ScanSummary,
        copy: &PdfCopy,
    ) {
        let CardFrame {
            x,
            top_y,
            width,
            height,
        } = frame;
        self.pdf.set_color(&Color::rgb(248, 250, 252));
        self.pdf
            .draw_rectangle_filled(x, top_y - height, width, height);
        self.pdf.set_line_width(0.7);
        self.pdf.set_color(&Color::rgb(226, 232, 240));
        self.pdf.draw_line(
            [
                (x, top_y - height),
                (x + width, top_y - height),
                (x + width, top_y),
                (x, top_y),
                (x, top_y - height),
            ]
            .into_iter(),
        );

        self.pdf.font(Font::HelveticaBold, 14);
        self.pdf.set_color(&Color::rgb(15, 23, 42));
        self.pdf
            .draw_text(x + 16.0, top_y - 16.0, Alignment::TopLeft, title);

        let rows = [
            (
                copy.scanned_packages,
                summary.scanned_package_count.to_string(),
            ),
            (copy.flagged_packages, summary.flagged_count.to_string()),
            (
                copy.launcher_warnings,
                summary.launcher_risk_count.to_string(),
            ),
            (copy.protected_packages, summary.protected_count.to_string()),
            (
                copy.notification_suspects,
                summary.notification_suspect_count.to_string(),
            ),
        ];

        let mut row_y = top_y - 42.0;
        for (label, value) in rows {
            self.pdf.font(Font::Helvetica, 10);
            self.pdf.set_color(&Color::rgb(100, 116, 139));
            self.pdf
                .draw_text(x + 16.0, row_y, Alignment::TopLeft, label);
            self.pdf.font(Font::HelveticaBold, 11);
            self.pdf.set_color(&Color::rgb(30, 41, 59));
            self.pdf
                .draw_text(x + width - 16.0, row_y, Alignment::TopRight, &value);
            row_y -= 18.0;
        }
    }

    fn draw_bulleted_panel(&mut self, copy: &PdfCopy, items: &[String]) {
        let available_width = Self::CONTENT_WIDTH - 32.0;
        let lines = if items.is_empty() {
            vec![(false, copy.none_recorded.to_string())]
        } else {
            items
                .iter()
                .flat_map(|item| {
                    wrap_text_to_width(item, available_width - 14.0, 11.0)
                        .into_iter()
                        .enumerate()
                        .map(|(index, line)| (index == 0, line))
                        .collect::<Vec<_>>()
                })
                .collect::<Vec<_>>()
        };
        let panel_height = 22.0 + lines.len() as f64 * 16.0;
        self.ensure_space(panel_height + 8.0);

        self.pdf.set_color(&Color::rgb(248, 250, 252));
        self.pdf.draw_rectangle_filled(
            Self::MARGIN_X,
            self.cursor_y - panel_height,
            Self::CONTENT_WIDTH,
            panel_height,
        );
        self.pdf.set_line_width(0.7);
        self.pdf.set_color(&Color::rgb(226, 232, 240));
        self.pdf.draw_line(
            [
                (Self::MARGIN_X, self.cursor_y - panel_height),
                (
                    Self::PAGE_WIDTH - Self::MARGIN_X,
                    self.cursor_y - panel_height,
                ),
                (Self::PAGE_WIDTH - Self::MARGIN_X, self.cursor_y),
                (Self::MARGIN_X, self.cursor_y),
                (Self::MARGIN_X, self.cursor_y - panel_height),
            ]
            .into_iter(),
        );

        let mut text_y = self.cursor_y - 16.0;
        for (bullet, line) in lines {
            self.pdf.font(Font::Helvetica, 11);
            self.pdf.set_color(&Color::rgb(51, 65, 85));
            if bullet && !items.is_empty() {
                self.pdf
                    .draw_text(Self::MARGIN_X + 14.0, text_y, Alignment::TopLeft, "-");
            }
            self.pdf.draw_text(
                Self::MARGIN_X
                    + if bullet && !items.is_empty() {
                        28.0
                    } else {
                        16.0
                    },
                text_y,
                Alignment::TopLeft,
                &line,
            );
            text_y -= 16.0;
        }

        self.cursor_y -= panel_height + 16.0;
    }

    fn draw_results_table(&mut self, copy: &PdfCopy, results: &[CleanupResultRecord]) {
        if results.is_empty() {
            self.draw_bulleted_panel(copy, &[]);
            return;
        }

        for result in results {
            let block_height = self.result_block_height(copy, result);
            self.ensure_space(block_height + 10.0);
            self.draw_result_row(copy, result, block_height);
            self.cursor_y -= block_height + 10.0;
        }
    }

    fn result_block_height(&self, copy: &PdfCopy, result: &CleanupResultRecord) -> f64 {
        let content_x = Self::MARGIN_X + 22.0;
        let content_width = Self::PAGE_WIDTH - Self::MARGIN_X - content_x - 18.0;
        let title_lines = wrap_text_to_width(&result.package_name, content_width - 76.0, 12.0);
        let message_lines = wrap_text_to_width(&result.message, content_width, 11.0);
        let guidance_lines = result
            .rollback_guidance
            .as_ref()
            .map(|guidance| {
                wrap_text_to_width(
                    &format!(
                        "{}: {}",
                        copy.rollback_guidance,
                        copy.localize_guidance(guidance)
                    ),
                    content_width,
                    10.0,
                )
            })
            .unwrap_or_default();

        20.0 + title_lines.len() as f64 * 16.0
            + message_lines.len() as f64 * 15.0
            + guidance_lines.len() as f64 * 14.0
            + if guidance_lines.is_empty() { 0.0 } else { 8.0 }
            + 12.0
    }

    fn draw_result_row(&mut self, copy: &PdfCopy, result: &CleanupResultRecord, height: f64) {
        let x = Self::MARGIN_X;
        let width = Self::CONTENT_WIDTH;
        let accent = if result.success {
            Color::rgb(22, 163, 74)
        } else {
            Color::rgb(220, 38, 38)
        };

        self.pdf.set_color(&Color::rgb(248, 250, 252));
        self.pdf
            .draw_rectangle_filled(x, self.cursor_y - height, width, height);
        self.pdf.set_color(&accent);
        self.pdf
            .draw_rectangle_filled(x, self.cursor_y - height, 8.0, height);
        self.pdf.set_line_width(0.7);
        self.pdf.set_color(&Color::rgb(226, 232, 240));
        self.pdf.draw_line(
            [
                (x, self.cursor_y - height),
                (x + width, self.cursor_y - height),
                (x + width, self.cursor_y),
                (x, self.cursor_y),
                (x, self.cursor_y - height),
            ]
            .into_iter(),
        );

        let content_x = x + 22.0;
        let content_width = width - 40.0;
        self.pdf.font(Font::HelveticaBold, 12);
        self.pdf.set_color(&Color::rgb(15, 23, 42));
        let mut line_y = self.draw_text_lines(
            content_x,
            self.cursor_y - 14.0,
            &wrap_text_to_width(&result.package_name, content_width - 76.0, 12.0),
            PdfTextStyle {
                color: Color::rgb(15, 23, 42),
                font: Font::HelveticaBold,
                font_size: 12.0,
                line_height: 16.0,
            },
        );
        self.pdf.font(Font::HelveticaBold, 10);
        self.pdf.set_color(&accent);
        self.pdf.draw_text(
            x + width - 18.0,
            self.cursor_y - 14.0,
            Alignment::TopRight,
            if result.success {
                copy.status_success
            } else {
                copy.status_failed
            },
        );

        line_y -= 4.0;
        line_y = self.draw_text_lines(
            content_x,
            line_y,
            &wrap_text_to_width(
                &copy.localize_result_message(&result.message),
                content_width,
                11.0,
            ),
            PdfTextStyle {
                color: Color::rgb(51, 65, 85),
                font: Font::Helvetica,
                font_size: 11.0,
                line_height: 15.0,
            },
        );

        if let Some(guidance) = &result.rollback_guidance {
            line_y -= 4.0;
            let guidance_lines = wrap_text_to_width(
                &format!(
                    "{}: {}",
                    copy.rollback_guidance,
                    copy.localize_guidance(guidance)
                ),
                content_width,
                10.0,
            );
            self.draw_text_lines(
                content_x,
                line_y,
                &guidance_lines,
                PdfTextStyle {
                    color: Color::rgb(100, 116, 139),
                    font: Font::Helvetica,
                    font_size: 10.0,
                    line_height: 14.0,
                },
            );
        }
    }

    fn draw_text_lines(
        &mut self,
        x: f64,
        top_y: f64,
        lines: &[String],
        style: PdfTextStyle,
    ) -> f64 {
        self.pdf.font(style.font, style.font_size);
        self.pdf.set_color(&style.color);
        let mut y = top_y;
        for line in lines {
            self.pdf.draw_text(x, y, Alignment::TopLeft, line);
            y -= style.line_height;
        }
        y
    }
}

fn wrap_text_to_width(text: &str, max_width: f64, font_size: f64) -> Vec<String> {
    let mut lines = Vec::new();
    for paragraph in text.split('\n') {
        if paragraph.trim().is_empty() {
            lines.push(String::new());
            continue;
        }

        let mut current = String::new();
        for word in paragraph.split_whitespace() {
            if estimate_text_width(word, font_size) > max_width {
                if !current.is_empty() {
                    lines.push(current.trim_end().to_string());
                    current.clear();
                }

                let mut chunk = String::new();
                for character in word.chars() {
                    let prospective = format!("{chunk}{character}");
                    if !chunk.is_empty() && estimate_text_width(&prospective, font_size) > max_width
                    {
                        lines.push(chunk.clone());
                        chunk.clear();
                    }
                    chunk.push(character);
                }
                if !chunk.is_empty() {
                    current.push_str(&chunk);
                    current.push(' ');
                }
                continue;
            }

            let prospective = if current.is_empty() {
                word.to_string()
            } else {
                format!("{current}{word}")
            };
            if estimate_text_width(&prospective, font_size) > max_width && !current.is_empty() {
                lines.push(current.trim_end().to_string());
                current.clear();
            }

            current.push_str(word);
            current.push(' ');
        }

        if !current.is_empty() {
            lines.push(current.trim_end().to_string());
        }
    }

    if lines.is_empty() {
        vec![String::new()]
    } else {
        lines
    }
}

fn estimate_text_width(text: &str, font_size: f64) -> f64 {
    let units = text.chars().fold(0.0, |accumulator, character| {
        accumulator
            + match character {
                'i' | 'l' | 'I' | '1' | '.' | ',' | ':' | ';' | '\'' | '|' => 0.32,
                't' | 'f' | 'j' | 'r' | '(' | ')' | '[' | ']' | ' ' => 0.38,
                'm' | 'w' | 'M' | 'W' | '@' | '%' | '&' => 0.92,
                'A'..='Z' => 0.68,
                '0'..='9' => 0.58,
                _ => 0.56,
            }
    });
    units * font_size
}

struct PdfCopy {
    after_cleanup: &'static str,
    before_cleanup: &'static str,
    device_label: &'static str,
    document_label: &'static str,
    flagged_packages: &'static str,
    failed_actions: &'static str,
    flagged_delta: &'static str,
    language_label: &'static str,
    launcher_observations: &'static str,
    launcher_warnings: &'static str,
    none_recorded: &'static str,
    notification_suspects: &'static str,
    overview: &'static str,
    packages_removed: &'static str,
    protected_packages: &'static str,
    report_id: &'static str,
    results: &'static str,
    rollback_guidance: &'static str,
    scanned_packages: &'static str,
    selected_packages: &'static str,
    status_failed: &'static str,
    status_success: &'static str,
    summary: &'static str,
    timestamp: &'static str,
    title: &'static str,
    language: PdfExportLanguage,
}

impl PdfCopy {
    fn for_language(language: &PdfExportLanguage) -> Self {
        match language {
            PdfExportLanguage::En => Self {
                after_cleanup: "After cleanup",
                before_cleanup: "Before cleanup",
                device_label: "Device",
                document_label: "Service document",
                failed_actions: "Failed actions",
                flagged_packages: "Flagged packages",
                flagged_delta: "Flagged delta",
                language_label: "Language",
                launcher_observations: "Launcher observations",
                launcher_warnings: "Launcher warnings",
                none_recorded: "None recorded.",
                notification_suspects: "Notification suspects",
                overview: "OVERVIEW",
                packages_removed: "Packages removed",
                protected_packages: "Protected packages",
                report_id: "Report ID",
                results: "Results",
                rollback_guidance: "Rollback guidance",
                scanned_packages: "Scanned packages",
                selected_packages: "Selected packages",
                status_failed: "FAILED",
                status_success: "SUCCESS",
                summary: "Summary",
                timestamp: "Timestamp",
                title: "Cleanroom Service Report",
                language: PdfExportLanguage::En,
            },
            PdfExportLanguage::No => Self {
                after_cleanup: "Etter opprydding",
                before_cleanup: "Før opprydding",
                device_label: "Enhet",
                document_label: "Servicedokument",
                failed_actions: "Feilede handlinger",
                flagged_packages: "Flaggede pakker",
                flagged_delta: "Endring i flaggede",
                language_label: "Språk",
                launcher_observations: "Observasjoner om startskjerm",
                launcher_warnings: "Advarsler om startskjerm",
                none_recorded: "Ingen registrert.",
                notification_suspects: "Varslingsmistenkte",
                overview: "OVERSIKT",
                packages_removed: "Fjernede pakker",
                protected_packages: "Beskyttede pakker",
                report_id: "Rapport-ID",
                results: "Resultater",
                rollback_guidance: "Veiledning for gjenoppretting",
                scanned_packages: "Skannede pakker",
                selected_packages: "Valgte pakker",
                status_failed: "FEILET",
                status_success: "VELLYKKET",
                summary: "Sammendrag",
                timestamp: "Tidspunkt",
                title: "Cleanroom Servicerapport",
                language: PdfExportLanguage::No,
            },
        }
    }

    fn language_name(&self, language: &PdfExportLanguage) -> &'static str {
        match language {
            PdfExportLanguage::En => "English",
            PdfExportLanguage::No => "Norsk",
        }
    }

    fn localized_summary(&self, report: &CleanupSessionReport) -> String {
        let success_count = report
            .results
            .iter()
            .filter(|result| result.success)
            .count();
        let failure_count = report.results.len().saturating_sub(success_count);

        match self.language_code() {
            "en" => format!(
                "{}: {} removed, {} failed, flagged {} to {}",
                self.summary,
                success_count,
                failure_count,
                report.before_summary.flagged_count,
                report.after_summary.flagged_count
            ),
            _ => format!(
                "{}: {} fjernet, {} feilet, flaggede {} til {}",
                self.summary,
                success_count,
                failure_count,
                report.before_summary.flagged_count,
                report.after_summary.flagged_count
            ),
        }
    }

    fn language_code(&self) -> &'static str {
        match self.language {
            PdfExportLanguage::En => "en",
            PdfExportLanguage::No => "no",
        }
    }

    fn localize_result_message(&self, message: &str) -> String {
        match self.language {
            PdfExportLanguage::En => message.to_string(),
            PdfExportLanguage::No => {
                if message == "Uninstall completed successfully." {
                    "Avinstallering fullfort uten feil.".to_string()
                } else if message
                    == "Package looks launcher-related. Confirm launcher removal before running cleanup."
                {
                    "Pakken ser ut til aa vaere startskjerm-relatert. Bekreft fjerning av startskjermapp for du kjorer opprydding.".to_string()
                } else if message
                    == "Package is protected by Cleanroom safety rules and cannot be removed."
                {
                    "Pakken er beskyttet av Cleanroom sine sikkerhetsregler og kan ikke fjernes.".to_string()
                } else if message == "Package is no longer present in the current device inventory." {
                    "Pakken finnes ikke lenger i den gjeldende enhetsoversikten.".to_string()
                } else if message == "ADB is not available on this system." {
                    "ADB er ikke tilgjengelig paa dette systemet.".to_string()
                } else if message == "No authorized Android device is ready for cleanup." {
                    "Ingen autorisert Android-enhet er klar for opprydding.".to_string()
                } else {
                    message.to_string()
                }
            }
        }
    }

    fn localize_guidance(&self, guidance: &str) -> String {
        match self.language {
            PdfExportLanguage::En => guidance.to_string(),
            PdfExportLanguage::No => {
                if guidance
                    == "If this package really is the current launcher, restore a safe home app before retrying removal."
                {
                    "Hvis denne pakken faktisk er gjeldende startskjermapp, gjenopprett en trygg startskjermapp for du prover fjerning pa nytt.".to_string()
                } else if guidance
                    == "Uninstall over ADB is not automatically reversible. Reinstall the app from a trusted source if the customer needs it restored."
                {
                    "Avinstallering via ADB kan ikke angres automatisk. Installer appen pa nytt fra en betrodd kilde hvis kunden trenger den tilbake.".to_string()
                } else if guidance
                    == "Review the package in Settings or Play Store, then retry after confirming permissions, active admin roles, or launcher state."
                {
                    "Se gjennom pakken i Innstillinger eller Play Butikk, og prov igjen etter at du har bekreftet tillatelser, aktive administratorroller eller startskjermstatus.".to_string()
                } else {
                    guidance.to_string()
                }
            }
        }
    }

    fn localize_observation(&self, observation: &str) -> String {
        match self.language {
            PdfExportLanguage::En => observation.to_string(),
            PdfExportLanguage::No => observation
                .strip_suffix(" was treated as launcher-related during cleanup review.")
                .map(|package_name| {
                    format!(
                        "{package_name} ble behandlet som startskjerm-relatert under oppryddingsvurderingen."
                    )
                })
                .unwrap_or_else(|| observation.to_string()),
        }
    }
}

impl PdfExportLanguage {
    fn code(&self) -> &'static str {
        match self {
            PdfExportLanguage::En => "en",
            PdfExportLanguage::No => "no",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{estimate_text_width, export_status_for_report, wrap_text_to_width};

    #[test]
    fn wraps_long_words_without_dropping_characters() {
        let wrapped = wrap_text_to_width("supercalifragilisticexpialidocious", 60.0, 11.0);
        assert!(wrapped
            .iter()
            .all(|line| estimate_text_width(line, 11.0) <= 60.0));
        assert_eq!(wrapped.join(""), "supercalifragilisticexpialidocious");
    }

    #[test]
    fn wraps_sentences_by_estimated_width() {
        let wrapped = wrap_text_to_width(
            "Rollback guidance should wrap cleanly inside the result block.",
            120.0,
            10.0,
        );
        assert!(wrapped.len() > 1);
        assert!(wrapped
            .iter()
            .all(|line| estimate_text_width(line, 10.0) <= 120.0));
    }

    #[test]
    fn export_status_defaults_without_pdf_artifacts() {
        let status = export_status_for_report("definitely-missing-cleanup-report");
        assert_eq!(status, "Local JSON + text");
    }
}
