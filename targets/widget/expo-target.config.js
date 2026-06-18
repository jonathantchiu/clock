/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  deploymentTarget: "17.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.timekeep"],
  },
};
