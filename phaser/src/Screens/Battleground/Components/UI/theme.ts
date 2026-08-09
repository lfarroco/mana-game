export const UI_BACKGROUND_COLOR = 0x040b14;
export const UI_BACKGROUND_OVERLAY_COLOR = 0x06111c;
export const UI_BACKGROUND_OVERLAY_ALPHA = 0.36;

export const UI_SURFACE_COLOR = 0x08121f;
export const UI_SURFACE_HOVER_COLOR = 0x102131;
export const UI_SURFACE_ALPHA = 0.84;
export const UI_SURFACE_BORDER_COLOR = 0x7ae7ff;
export const UI_SURFACE_BORDER_ALPHA = 0.92;
export const UI_SURFACE_BORDER_WIDTH = 2;
export const UI_SURFACE_ACTIVE_BORDER_WIDTH = 4;
export const UI_SURFACE_ACCENT_COLOR = 0x7ae7ff;
export const UI_SURFACE_HOVER_BORDER_COLOR = 0x9cefff;

export const UI_FIELD_COLOR = 0x0c1827;
export const UI_FIELD_ALPHA = 0.92;
export const UI_FIELD_BORDER_COLOR = 0x4eaecf;
export const UI_FIELD_BORDER_ALPHA = 0.82;

export const UI_OVERLAY_COLOR = 0x020812;
export const UI_OVERLAY_ALPHA = 0.8;

export const UI_TABLE_COLOR = 0x0a1523;
export const UI_TABLE_BORDER_COLOR = 0x4eaecf;
export const UI_TABLE_HEADER_COLOR = 0x102131;
export const UI_TABLE_ROW_EVEN_COLOR = 0x0d1a2a;
export const UI_TABLE_ROW_ODD_COLOR = 0x09131f;
export const UI_TABLE_ROW_BORDER_COLOR = 0x24465d;

export const UI_TEXT_PRIMARY = "#ffffff";
export const UI_TEXT_MUTED = "#c6e7f5";
export const UI_TEXT_LABEL = "#8fcde5";
export const UI_TEXT_ACCENT = "#d9f7ff";
export const UI_TEXT_INFO = "#9fdcff";

export const UI_HTML_INPUT_STYLE =
	"width:100%; box-sizing:border-box; padding:12px; font-size:18px; border-radius:8px; border:1px solid #4eaecf; background:rgba(8,18,31,0.92); color:#ffffff;";

export const UI_TOOLTIP_BG_COLOR = 0x123247;
export const UI_TOOLTIP_BORDER_COLOR = UI_SURFACE_HOVER_BORDER_COLOR;
export const UI_TOOLTIP_ACCENT_COLOR = UI_SURFACE_BORDER_COLOR;
export const UI_TOOLTIP_FILL_ALPHA = 0.8;
export const UI_TOOLTIP_BORDER_THICKNESS = 5;

export const mixHexColors = (from: number, to: number, amount: number): number => {
	const progress = Math.max(0, Math.min(1, amount));
	const fromR = (from >> 16) & 0xff;
	const fromG = (from >> 8) & 0xff;
	const fromB = from & 0xff;
	const toR = (to >> 16) & 0xff;
	const toG = (to >> 8) & 0xff;
	const toB = to & 0xff;

	const r = Math.round(fromR + (toR - fromR) * progress);
	const g = Math.round(fromG + (toG - fromG) * progress);
	const b = Math.round(fromB + (toB - fromB) * progress);

	return (r << 16) | (g << 8) | b;
};
