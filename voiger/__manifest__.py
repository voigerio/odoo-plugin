{
    "name": "Voiger",
    "summary": "Make and take Voiger calls without leaving Odoo",
    "description": "Opens the Voiger dialer in a panel on every Odoo screen. Requires a Voiger account.",
    "version": "20.0.1.3.0",
    "category": "Productivity/VoIP",
    "author": "Voiger",
    "maintainer": "Voiger",
    "website": "https://voiger.io",
    "license": "LGPL-3",
    "depends": ["web", "mail", "phone_validation"],
    "images": ["static/description/voiger_screenshot.png"],
    "assets": {
        "web.assets_backend": [
            "voiger/static/src/voiger_panel.js",
            "voiger/static/src/voiger_plugin.js",
            "voiger/static/src/voiger_systray.js",
            "voiger/static/src/voiger.scss",
        ],
    },
    "installable": True,
    "application": False,
}
