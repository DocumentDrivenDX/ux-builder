// Where the site's root is from this page: "./" for the home page and its section pages at the site's root,
// "../" for the draft built into v2/ (tools/build-microsite-draft.mjs sets VITE_SITE_ROOT). Links to themes/ and storybook/ start here.
export const ROOT = import.meta.env.VITE_SITE_ROOT ?? "./";
