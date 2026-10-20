import { rmSync } from "node:fs";

export async function cleanupInstalledTest({ browser, server, app }) {
  try {
    await browser?.close();
  } finally {
    try {
      if (server)
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
    } finally {
      rmSync(app, { recursive: true, force: true });
    }
  }
}
