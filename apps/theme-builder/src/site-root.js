// Where the site's root is from this page: "./" for the home page and its section pages, at the site's root.
// Links to themes/ and storybook/ start here; a build that serves these pages elsewhere sets VITE_SITE_ROOT.
export const ROOT = import.meta.env.VITE_SITE_ROOT ?? "./";
