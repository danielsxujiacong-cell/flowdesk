# FlowDesk

FlowDesk is a small handoff and action tracking app for internal team workflows. The V0.1 demo runs entirely in the browser and saves its data to LocalStorage.

## Run locally

```sh
npm install
npm run dev
```

Use `npm run build` to create a production build. The first visit starts with sample handoffs, actions, and a partially completed release checklist. Use **Reset demo data** in the sidebar to restore the sample workspace.

## Open on another computer

Download and extract the project archive, then open the `flowdesk` folder in Codex. In a terminal in that folder, run:

```sh
npm install
npm run dev
```

If you connect the project to a GitHub repository later, clone that repository and use the same commands. LocalStorage data stays in the browser on the device where it was created.
