import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "Chromium",
      browser: {
        provider: "playwright",
        enabled: true,
        name: "chromium",
        providerOptions: {
          launch: {
            args: [
              "--use-fake-device-for-media-stream",
              "--use-fake-ui-for-media-stream",
            ],
          },
          context: {
            permissions: ["microphone"],
          },
        },
      },
    },
  },
  {
    test: {
      name: "Firefox",
      browser: {
        provider: "playwright",
        enabled: true,
        name: "firefox",
        providerOptions: {
          launch: {
            firefoxUserPrefs: {
              "permissions.default.microphone": 1,
              "media.navigator.streams.fake": true,
              "media.navigator.permission.disabled": true,
            },
          },
        },
      },
    },
  },
]);
