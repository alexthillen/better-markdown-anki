# Local add-on guide

From the repository root, serve the site on this computer only:

```sh
python3 website/server.py
```

Open <http://127.0.0.1:4178/>. Press Ctrl+C in the server terminal to stop it.
The server exposes the locally built add-on frontend to the example previews.
Run `cd frontend && npm run build` after changing the renderer.

To assemble a self-contained static site in `website/dist/`, run:

```sh
python3 website/build.py
```

The site has no external runtime assets or dependencies. Reference links lead
to external documentation only when selected.

Publishing a non-prerelease GitHub release builds and deploys the site to
GitHub Pages after the add-on package succeeds. Release tags must start with
`v` followed by a digit (for example, `v1.2.3`), matching the Pages environment's
deployment rule.
