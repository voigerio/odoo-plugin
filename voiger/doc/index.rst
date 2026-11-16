Voiger for Odoo
===============

Voiger opens the Voiger dialer in a panel on every Odoo screen.

Requirements
------------

* A Voiger account. The app is free to install; calling needs a paid Voiger agent login.
* Google Chrome, with microphone access allowed for your Odoo address.

Usage
-----

#. Click the phone button in the Odoo top bar.
#. Sign in with your Voiger account.
#. Allow the microphone when Chrome asks.
#. Enter a number and press call.

You can also click any phone number in Odoo; Voiger opens and calls it. Numbers need a
country code, for example +66.

The call keeps running while you move between Odoo apps, and while the panel is hidden.

An incoming call opens the panel by itself. If the caller's number belongs to one Odoo
contact, Odoo opens that contact.

When a call ends, it is logged as a note on the record you called from, and on the lead's
contact for a lead or opportunity. Other calls are logged on the one contact with that number;
a number shared by several contacts is not logged on any of them. For a number that is no
contact yet, click **Create contact** and the call is logged on the new contact.

The note shows the result, talk and hold time, who hung up, the queue, the agent and the
Voiger call ID. Your Voiger notes, the AI summary and a link to the recording are added when
Voiger has them, even several minutes after the call. The recording link works for 90 days
after the call. Voiger tags are added to the contact as
tags. A tag Odoo doesn't have yet is created only for users allowed to create contact tags,
such as sales users.

The panel opens under the phone button and closes when you click elsewhere in Odoo. A call
goes on while the panel is closed. Use the pin in the panel header to keep it open; the choice
is kept in this browser.

The app sends Voiger the numbers you call. Call details come from Voiger to Odoo.
