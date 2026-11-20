#!/usr/bin/env node
// Switches the App target of ios/App/App.xcodeproj to manual App Store signing and stamps the build number.
// Env: TEAM_ID, PROFILE_NAME, BUILD_NUMBER. Writes build/ExportOptions.plist.
const fs = require('fs');
const path = require('path');

const { TEAM_ID, PROFILE_NAME, BUILD_NUMBER, BUNDLE_ID } = process.env;
for (const [k, v] of Object.entries({ TEAM_ID, PROFILE_NAME, BUILD_NUMBER, BUNDLE_ID })) {
  if (!v) { console.error(`::error::${k} is empty`); process.exit(1); }
}

const pbx = path.join('ios', 'App', 'App.xcodeproj', 'project.pbxproj');
let s = fs.readFileSync(pbx, 'utf8');
// Target-level build settings blocks are the ones that set PRODUCT_BUNDLE_IDENTIFIER.
let n = 0;
s = s.replace(/buildSettings = \{([^}]*?PRODUCT_BUNDLE_IDENTIFIER = [^;]+;[^}]*?)\};/g, (_m, body) => {
  n++;
  body = body
    .replace(/\s*CODE_SIGN_STYLE = [^;]+;/g, '')
    .replace(/\s*CODE_SIGN_IDENTITY(\[[^\]]*\])? = [^;]+;/g, '')
    .replace(/\s*"CODE_SIGN_IDENTITY\[[^\]]*\]" = [^;]+;/g, '')
    .replace(/\s*DEVELOPMENT_TEAM = [^;]+;/g, '')
    .replace(/\s*PROVISIONING_PROFILE_SPECIFIER = [^;]+;/g, '')
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/, `CURRENT_PROJECT_VERSION = ${BUILD_NUMBER};`);
  return `buildSettings = {${body}
				CODE_SIGN_STYLE = Manual;
				CODE_SIGN_IDENTITY = "Apple Distribution";
				DEVELOPMENT_TEAM = ${TEAM_ID};
				PROVISIONING_PROFILE_SPECIFIER = "${PROFILE_NAME}";
			};`;
});
if (n === 0) { console.error('::error::App target build settings not found in project.pbxproj'); process.exit(1); }
fs.writeFileSync(pbx, s);
console.log(`Patched ${n} build configuration(s): manual signing, team ${TEAM_ID}, profile "${PROFILE_NAME}", build ${BUILD_NUMBER}`);

fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/ExportOptions.plist', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>teamID</key><string>${TEAM_ID}</string>
  <key>signingStyle</key><string>manual</string>
  <key>provisioningProfiles</key>
  <dict><key>${BUNDLE_ID}</key><string>${PROFILE_NAME}</string></dict>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
`);
