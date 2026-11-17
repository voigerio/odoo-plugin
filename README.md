# Voiger for Odoo

The Voiger dialer inside Odoo. Click any phone number in Odoo to call it, take incoming calls on
every Odoo screen, and get each call logged as a note on the Odoo contact, lead or opportunity.

The app is free. Calling needs a Voiger account: [voiger.io](https://voiger.io).

Each Odoo version installs from its own branch: `20.0` for Odoo 20. Work goes to `main` first.

## Install

An Odoo administrator installs the app once for the whole database. Every user then sees a phone
button in Odoo's top bar.

### Odoo Online

Install **Voiger** from the Odoo Apps Store.

To install a copy from this repository instead:

1. Build `dist/voiger.zip` with `scripts/build-zip.sh`.
2. In Odoo, open **Apps** with `?debug=1` in the address, then **Import Module**, and upload the zip.

### Odoo.sh

1. In your Odoo.sh project, open **Branches** and choose the branch to add Voiger to.
2. Click **Submodule**, then **Run on Odoo.sh**, and fill in:
   - **Repository URL:** `git@github.com:voigerio/odoo-plugin.git`
   - **Branch:** `20.0`
   - **Path:** `voiger-odoo`

   Or, with Git:

   ```bash
   git submodule add -b 20.0 git@github.com:voigerio/odoo-plugin.git voiger-odoo
   git commit -m "Add Voiger"
   git push
   ```

3. When the build is done, open **Apps** in Odoo, choose **Update Apps List**, search for
   **Voiger** and install it.

Odoo.sh adds the apps in a submodule to Odoo by itself; see Odoo's guide,
[Submodules](https://www.odoo.com/documentation/20.0/administration/odoo_sh/advanced.html#submodules).

### Self-hosted Odoo

1. Put this repository in a folder on your Odoo server, and add that folder to Odoo's
   `addons_path`.
2. Restart Odoo, open **Apps**, choose **Update Apps List**, search for **Voiger** and install it.

## Use

1. Click the phone button in Odoo's top bar.
2. Sign in with your Voiger account, and allow the microphone when Chrome asks.
3. Click any phone number in Odoo, or enter one in the dialer.

The [app's documentation](voiger/doc/index.rst) describes calling and call logging in full.

## Uninstall

Uninstall **Voiger** from Odoo's **Apps**. The phone button goes away; the call notes stay on the
records.

## License

LGPL-3. See [LICENSE](LICENSE).
