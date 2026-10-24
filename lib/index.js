/**
 * Host half of dsh-file-drag.
 *
 * Pure UI plugin: the empty apply exists only so the package appears as an
 * ordinary Loader row. The browser half ships through exports["./client"] and
 * is discovered from the package.json `dsh.client` declaration.
 */

/** Host plugin body — no host-side behaviour for this surface plugin. */
export function apply() {}
