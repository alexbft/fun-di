export function uncapitalize(s: string): string {
	return s === "" ? s : `${s[0].toLowerCase()}${s.substring(1)}`;
}
