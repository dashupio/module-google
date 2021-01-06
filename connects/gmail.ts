
// import connect interface;
import MailComposer from 'nodemailer/lib/mail-composer';
import { google } from 'googleapis';
import { Struct, Query, Model } from '@dashup/module';

/**
 * build address helper
 */
export default class GmailConnect extends Struct {
  /**
   * construct google connector
   *
   * @param args 
   */
  constructor(...args) {
    // run super
    super(...args);

    // save action
    this.saveAction = this.saveAction.bind(this);
    this.pollEmails = this.pollEmails.bind(this);
    this.sendAction = this.sendAction.bind(this);
    this.profileAction = this.profileAction.bind(this);

    // create listener
    setInterval(this.pollEmails, 30 * 1000);
  }

  /**
   * returns connect type
   */
  get type() {
    // return connect type label
    return 'gmail';
  }

  /**
   * returns connect type
   */
  get title() {
    // return connect type label
    return 'Google Gmail';
  }

  /**
   * returns connect icon
   */
  get icon() {
    // return connect icon label
    return 'fa fa-mail-bulk';
  }

  /**
   * returns connect data
   */
  get data() {
    // return connect data
    return {
      client : this.dashup.config.client,
    };
  }

  /**
   * returns object of views
   */
  get views() {
    // return object of views
    return {
      auth   : 'connect/gmail/auth',
      config : 'connect/gmail/config',
    };
  }

  /**
   * returns connect actions
   */
  get actions() {
    // return connect actions
    return {
      save    : this.saveAction,
      send    : this.sendAction,
      profile : this.profileAction,
    };
  }

  /**
   * returns category list for connect
   */
  get categories() {
    // return array of categories
    return ['phone'];
  }

  /**
   * returns connect descripton for list
   */
  get description() {
    // return description string
    return 'Google Gmail Connector';
  }

  /**
   * poll emails
   */
  async pollEmails() {
    // all pages
    const pages = await new Query({
      struct : 'gmail',
    }, 'page').where({
      'connects.type' : 'gmail',
    }).find();

    // check loading
    if (this.loading) return;
    this.loading = true;

    // fix domain
    const domain = this.dashup.config.url.includes('_front') ? `https://dashup.io` : this.dashup.config.url;

    // try/catch
    try {
      // loop
      for (const page of pages) {
        // load connect
        const connects = (page.get('connects') || []).filter((c) => c.type === 'gmail' && c.email);

        // loop connects
        connects.forEach(async (connect) => {
          // create client
          const client = new google.auth.OAuth2(
            this.dashup.config.client,
            this.dashup.config.secret,
            `${domain}/connect/gmail`,
          );

          // set credentials
          client.setCredentials(connect.gmail.tokens);

          // gmail
          const gmail = google.gmail({
            auth    : client,
            version : 'v1',
          });

          // load messages
          const messages = await new Promise((resolve, reject) => {
            // list
            gmail.users.messages.list({
              auth       : client,
              userId     : 'me',
              maxResults : 1,
            }, (err, res) => {
              // check err
              if (err) return reject(err);

              // resolve
              resolve(res.data.messages);
            });
          });

          // loop messages
          for (const message of messages) {
            // check id
            const has = await new Query({
              type   : 'connect',
              page   : page.get('data.event.form'),
              model  : page.get('data.event.model'),
              struct : 'gmail',
            }, 'model').where({
              '_meta.model' : `${page.get('data.event.model')}`,
              '_meta.email' : `${message.id}`,
            }).count();

            // check has
            if (has) continue;

            // load message
            const actualMessage = await new Promise((resolve, reject) => {
              // load message
              gmail.users.messages.get({
                id     : message.id,
                auth   : client,
                userId : 'me',
              }, (err, res) => {
                // err
                if (err) return reject(err);

                // resolve
                resolve(res.data);
              });
            });

            if (!actualMessage.payload.parts || !actualMessage.payload.parts.find((p) => p.mimeType === 'text/plain')) return;

            // log
            let from = actualMessage.payload.headers.find((h) => h.name === 'From').value;
            const body = Buffer.from(actualMessage.payload.parts.find((p) => p.mimeType === 'text/plain').body.data, 'base64').toString('utf-8');
            const subject = actualMessage.payload.headers.find((h) => h.name === 'Subject').value;

            // check from
            if (from.includes('<')) from = from.split('<')[1].split('>')[0];

            // check for member
            const contactForms = await new Query({
              struct : 'gmail',
            }, 'page').where({
              'connects.type' : 'gmail',
            }).findByIds(page.get('data.forms'));

            // fields
            const contactFields = contactForms.reduce((accum, form) => {
              // push fields
              accum.push(...(form.get('data.fields') || []));

              // return accum
              return accum;
            }, []);
            const emailField = contactFields.find((f) => f.uuid === page.get('data.field.email'));

            // check field
            if (!emailField) return;

            // find by email
            const contact = await new Query({
              type   : 'connect',
              page   : page.get('data.forms.0'),
              model  : page.get('data.model'),
              struct : 'gmail',
            }, 'model').where({
              [emailField.name || emailField.uuid] : from,
            }).findOne();

            // if no contact, return
            if (!contact) return;

            // create email
            const form = await new Query({
              struct : 'gmail',
            }, 'page').findById(page.get('data.event.form'));

            // get fields
            const fields = {};
            ['type', 'item', 'body', 'time', 'title'].forEach((field) => {
              // set field
              fields[field] = (form.get('data.fields') || []).find((f) => f.uuid === page.get(`data.event.${field}`));
            });

            // create email event
            const event = new Model({
              _meta : {
                email : message.id,
              },
            });

            // fields
            if (fields.type) event.set(fields.type.name || fields.type.uuid, 'email:inbound');
            if (fields.item) event.set(fields.item.name || fields.item.uuid, contact.get('_id'));
            if (fields.body) event.set(fields.body.name || fields.body.uuid, `<b>Subject:</b> ${subject}<br />${body}`);
            if (fields.time) event.set(fields.time.name || fields.time.uuid, new Date());
            if (fields.title) event.set(fields.title.name || fields.title.uuid, `Received email from ${from} to ${connect.email}`);

            // save event
            await event.save({
              page   : form.get('data.event.form'),
              form   : form.get('data.event.form'),
              model  : page.get('data.event.model'),
              dashup : form.get('_meta.dashup'),
            });
          }
        });
      }
    } catch (e) {}

    // unset loading
    this.loading = false;
  }

  /**
   * action method
   *
   * @param param0 
   * @param connect 
   * @param data 
   */
  async saveAction({ req, dashup }, connect) {
    // check dashup
    if (!dashup || !req || !req.query || !req.query.code) return { connect };

    // fix domain
    const domain = this.dashup.config.url.includes('_front') ? `https://dashup.io` : this.dashup.config.url;

    // create client
    const client = new google.auth.OAuth2(
      this.dashup.config.client,
      this.dashup.config.secret,
      `${domain}/connect/gmail`,
    );

    // complete auth
    const { tokens } = await client.getToken(req.query.code);

    // set credentials
    client.setCredentials(tokens);

    // gmail
    const gmail = google.gmail({
      auth    : client,
      version : 'v1',
    });

    // list labels
    const profile = await new Promise((resolve, reject) => {
      // labels
      gmail.users.getProfile({
        userId : 'me',
      }, (err, res) => {
        // reject
        if (err) return reject(err);

        // resolve
        resolve(res.data);
      });
    });

    // set tokens
    connect.email = profile.emailAddress;
    connect.title = `Gmail: ${profile.emailAddress}`;
    connect.gmail = {
      tokens,
      code : req.query.code,
    };
    connect.profile = profile;

    // return connect
    return { connect };
  }

  /**
   * labels action
   *
   * @param opts 
   * @param connect 
   */
  async profileAction(opts, connect) {
    // fix domain
    const domain = this.dashup.config.url.includes('_front') ? `https://dashup.io` : this.dashup.config.url;

    // create client
    const client = new google.auth.OAuth2(
      this.dashup.config.client,
      this.dashup.config.secret,
      `${domain}/connect/gmail`,
    );

    // set credentials
    client.setCredentials(connect.gmail.tokens);

    // gmail
    const gmail = google.gmail({
      auth    : client,
      version : 'v1',
    });

    // list labels
    const profile = await new Promise((resolve, reject) => {
      // labels
      gmail.users.getProfile({
        userId : 'me',
      }, (err, res) => {
        // reject
        if (err) return reject(err);

        // resolve
        resolve(res.data);
      });
    });

    // return profile
    return profile;
  }

  /**
   * fields action
   *
   * @param opts 
   * @param connect 
   */
  async sendAction(opts, connect, { to, item, user, subject, body }) {
    // fix domain
    const domain = this.dashup.config.url.includes('_front') ? `https://dashup.io` : this.dashup.config.url;

    // create client
    const client = new google.auth.OAuth2(
      this.dashup.config.client,
      this.dashup.config.secret,
      `${domain}/connect/gmail`,
    );

    // set credentials
    client.setCredentials(connect.gmail.tokens);

    // gmail
    const gmail = google.gmail({
      auth    : client,
      version : 'v1',
    });

    // create body
    const email = new MailComposer({
      to,
      subject,

      from : connect.email,
      html : body,
      textEncoding : 'base64',
    });
    const encoded = await new Promise((resolve, reject) => {
      // compile email
      email.compile().build((err, data) => {
        // err
        if (err) return reject(err);

        // resolve
        return resolve(Buffer.from(data)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''));
      });
    });

    // send email
    const done = await new Promise((resolve, reject) => {
      // create email
      gmail.users.messages.send({
        auth     : client,
        userId   : 'me',
        resource : {
          raw : encoded,
        },
      }, (err, res) => {
        // reject
        if (err) return reject(err);
  
        // resolve
        resolve(res.data);
      });
    });

    // load form
    const [page, form] = await new Query(opts, 'page').findByIds([opts.page, opts.form]);

    // get fields
    const fields = {};
    ['type', 'item', 'body', 'time', 'user', 'title'].forEach((field) => {
      // set field
      fields[field] = (form.get('data.fields') || []).find((f) => f.uuid === page.get(`data.event.${field}`));
    });

    // create email event
    const event = new Model({
      _meta : {
        email  : done.id,
        thread : done.threadId,
      },
    });

    // fields
    if (fields.type) event.set(fields.type.name || fields.type.uuid, 'email:outbound');
    if (fields.item) event.set(fields.item.name || fields.item.uuid, item);
    if (fields.body) event.set(fields.body.name || fields.body.uuid, `<b>Subject:</b> ${subject}<br />${body}`);
    if (fields.time) event.set(fields.time.name || fields.time.uuid, new Date());
    if (fields.user) event.set(fields.user.name || fields.user.uuid, user);
    if (fields.title) event.set(fields.title.name || fields.title.uuid, `Sent email from ${connect.email} to ${to}`);

    // save event
    await event.save({
      user   : opts.user,
      page   : opts.form,
      form   : opts.form,
      model  : opts.model,
      dashup : opts.dashup,
    });

    // return true
    return true;
  }
}