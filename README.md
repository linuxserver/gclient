# GClient From Linuxserver

The purpose of this application is to provide a simple single RDP session in a web browser. Mostly it is leveraged by us at linuxserver.io to package up desktop applications as browser accessible web applications.
The application is not security hardened, we make a best effort to ensure authentication and application settings are setup properly but make no guarantees that this should ever be exposed to the internet directly. If you are interested in more hardened authentication we highly recommend taking a look at [SWAG](https://github.com/linuxserver/docker-swag) to use as a reverse proxy for HTTPS and authentication.

# Options

All application settings are passed via environment variables:

| Variable | Description |
| :----: | --- |
| CUSTOM_PORT | Port the application listed on, default 3000. |
| CUSTOM_USER | Desktop session user for the RDP connection, default abc. |
| PASSWORD | Desktop session password for the RDP connection, default abc. |
| RDP_HOST | IP address of RDP endpoint, default "127.0.0.1". |
| RDP_PORT | RDP port to connect to, default "3389".(quotes important not an integer) |
| AUTO_LOGIN | Set to false to disable auto login, default true. |
| SUBFOLDER | Subfolder for the application if running a subfolder reverse proxy, need both slashes IE `/subfolder/` |
| TITLE | The page title displayed on the web browser, default "Guacamole Client". |
| CYPHER | The cipher key to user for encoding the connection string token for guacamole, default "LSIOGCKYLSIOGCKYLSIOGCKYLSIOGCKY" |
| FM_NO_AUTH | This disables authentication for the file manager if set to true, default false. |
| FM_HOME | This is the home directory (landing) for the file manager, default "/config". |

# Usage

You can access advanced features of the Guacamole remote desktop using ctrl+alt+shift enabling you to use remote copy/paste, an onscreen keyboard, or a baked in file manager. This can also be accessed by clicking the small circle on the left side of the screen.

### Copy/paste

By exposing the sidebar menu you will see a text box where text can be entered and extracted. Anything currently copied to the web applications clipboard will be displayed in this box. Any text you enter will be available on the web appplications clipboard to be pasted. With use, pressing ctrl+alt+shift then ctrl+v to paste in your local desktop clipboard ctrl+alt+shift then ctrl+v in the web browser becomes like second nature. 

### On screen keyboard

This is geared towards touch interfaces, though we currently do not optimize for mobile, for tablets with a decent resolution it should be somewhat useable. The reason mobile is not a great experience is the desktop itself is always rendered at a pixel perfect resolution, even resizing the window will reconnect your session to re-render the desktop. At low phone resolutions a normal IDE has difficulty rendering even basic tools.

### File manager

The file manager is managed in house in this codebase. It supports simple navigation, uploading/downloading files, deleting files, creating folders, and drag and drop of files/folders.
The file manager has nothing to do with the RDP protocol it runs as the user running this nodejs application and will have all the permissions of that user. 
The authentication uses pam, so if the password is changed in the web client you will also need to enter that password every time you connect to the file manager. To disable authentication simply pass `FM_NO_AUTH=true`.
