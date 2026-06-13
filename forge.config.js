const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    icon: './assets/logo', // Kept from package.json
    asar: {
      unpack: '**/node_modules/better-sqlite3/**/*', // Merged to keep sqlite working!
      ignore: [      
        /^\/out$/,                 // Skips the build output folder entirely     
       /^\/\.git$/,  // Skips your git history files      
      /^\/\.vscode$/,            // Skips IDE settings folders      
      /^\/src\/music_cache$/,    // %E2%9A%A0%EF%B8%8F Change this to any folder where you keep local media/test MP3s      
      /.*\.pdb$/, // Skips bulky Windows debugging symbols    
      ],
    },
  },
  rebuildConfig: {},
  makers: [
    // {
    //   name: '@electron-forge/maker-squirrel',
    //   config: {},
    // },
    // {
    //   name: '@electron-forge/maker-zip',
    //   platforms: ['darwin'],
    // },
    // {
    //   name: '@electron-forge/maker-deb',
    //   config: {},
    // },
    // {
    //   name: '@electron-forge/maker-rpm',
    //   config: {},
    // },
    // {
    //   name: '@electron-forge/maker-wix',
    //   config: {
    //     name: 'Better Music',
    //     language: 1033,
    //     manufacturer: 'Muntean Andrei Elements Development',
    //     description: 'Better Music Player',
    //     upgradeCode: 'c051cb46-7188-432e-b137-2cf75d7f315d',
    //     programFilesFolderName: 'Better Music', // Fixed casing       
    //     shortcutName: 'Better Music',
    //     ui: {          
    //       chooseDirectory: true // Restored folder picker UI option
    //     },
    //   }
    // },
    {
      name: '@electron-forge/maker-msix',
      config: {
        identityName: 'ElementsDevelopment.BetterMusic1', // Fixed property name
        packageDisplayName: 'Better Music',
        publisher: 'CN=1A39B558-4432-4F27-A1B7-1A967AC1BA2B', 
        publisherDisplayName: 'Elements Development',
        packageDescription: 'A beautiful and simple music player.',
        // Correct way to link assets for MSIX windows packing
        assets: './assets', 
        programFilesFolderName: 'Better Music', // Fixed casing       
        ui: {          
          displayName: 'Better Music'        
        },
        windowsKitPath: 'D:/Windows Kits/10/bin/10.0.28000.0/x64',
        windowsKitVersion: '10.0.28000.0',
        devcert: 'create'
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};