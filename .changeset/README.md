# Changesets

Every pull request that changes what a consumer gets adds one:

    npx changeset

Pick the package and the bump, and write one line a consumer can act on.

| Change | Bump |
|---|---|
| A token's value is corrected, such as a contrast fix | patch |
| A token, widget or theme is added | minor |
| A token is renamed or removed, or a widget's props or behaviour change | major, after one major version with the old name kept as an alias |
