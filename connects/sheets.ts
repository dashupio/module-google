
// import connect interface;
import fetch from 'node-fetch';
import * as csv from '@fast-csv/parse';
import { google } from 'googleapis';
import { Struct, Query, Model } from '@dashup/module';

/**
 * build address helper
 */
export default class SheetsConnect extends Struct {
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
    this.listAction = this.listAction.bind(this);
    this.syncAction = this.syncAction.bind(this);
    this.fieldsAction = this.fieldsAction.bind(this);
  }

  /**
   * returns connect type
   */
  get type() {
    // return connect type label
    return 'sheets';
  }

  /**
   * returns connect type
   */
  get title() {
    // return connect type label
    return 'Google Sheets';
  }

  /**
   * returns connect icon
   */
  get icon() {
    // return connect icon label
    return 'fa fa-file-spreadsheet';
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
      auth   : 'connect/sheets/auth',
      config : 'connect/sheets/config',
    };
  }

  /**
   * returns connect actions
   */
  get actions() {
    // return connect actions
    return {
      save   : this.saveAction,
      list   : this.listAction,
      sync   : this.syncAction,
      fields : this.fieldsAction,
    };
  }

  /**
   * returns category list for connect
   */
  get categories() {
    // return array of categories
    return ['model'];
  }

  /**
   * returns connect descripton for list
   */
  get description() {
    // return description string
    return 'Google Sheets Connector';
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
    const domain = this.dashup.config.url.includes('.io') ? `https://dashup.io` : this.dashup.config.url;
    
    // create client
    const client = new google.auth.OAuth2(
      this.dashup.config.client,
      this.dashup.config.secret,
      `${domain}/connect/sheets`,
    );

    // complete auth
    const { tokens } = await client.getToken(req.query.code);

    // set credentials
    client.setCredentials(tokens);

    // set tokens
    connect.sheets = {
      tokens,
      code : req.query.code,
    };

    // return connect
    return { connect };
  }

  /**
   * list action
   *
   * @param opts 
   * @param connect 
   */
  async listAction(opts, connect) {
    // fix domain
    const domain = this.dashup.config.url.includes('.io') ? `https://dashup.io` : this.dashup.config.url;

    // create client
    const client = new google.auth.OAuth2(
      this.dashup.config.client,
      this.dashup.config.secret,
      `${domain}/connect/sheets`,
    );

    // set credentials
    client.setCredentials(connect.sheets.tokens);

    // drive
    const drive = google.drive({
      auth    : client,
      version : 'v3',
    });

    // mimes
    const mimes = [
      'text/csv',
      'text/tsv',
      'text/tab-separated-values',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ].map((m) => ` or mimeType='${m}'`).join(' ').trim();

    // List files
    const { data } = await drive.files.list({
      q        : `(mimeType='application/vnd.google-apps.spreadsheet'${mimes}) and trashed=false`,
      fields   : 'nextPageToken, files(id, name, mimeType, size, properties, version, mimeType, createdTime, modifiedTime, exportLinks, webContentLink)',
      spaces   : 'drive',
      pageSize : 1000
    });
    
    // return files
    return await Promise.all(data.files.map(async (file) => {
      // get size
      if (!file.size && file.exportLinks && file.exportLinks['text/csv']) {
        // get head
        const response = await fetch(file.exportLinks['text/csv'], {
          method : 'HEAD'
        });

        // get size
        file.size = parseInt(response.headers.get('content-length'), 10);
      }

      // sanitise
      return {
        id         : file.id,
        size       : file.size,
        name       : file.name,
        mime       : file.mimeType,
        version    : file.version,
        created_at : file.createdTime,
        updated_at : file.modifiedTime,
      };
    }));    
  }

  /**
   * fields action
   *
   * @param opts 
   * @param connect 
   */
  async fieldsAction(opts, connect) {
    // fix domain
    const domain = this.dashup.config.url.includes('.io') ? `https://dashup.io` : this.dashup.config.url;

    // create client
    const client = new google.auth.OAuth2(
      this.dashup.config.client,
      this.dashup.config.secret,
      `${domain}/connect/sheets`,
    );

    // set credentials
    client.setCredentials(connect.sheets.tokens);

    // drive
    const drive = google.drive({
      auth    : client,
      version : 'v3',
    });

    // data
    const data = [];
    
    // stream
    const stream = csv.parse({
      headers : true
    })
      .on('error', error => console.error(error))
      .on('data', (r) => data.push(r))
      .on('end', (rowCount: number) => console.log(`Parsed ${rowCount} rows`));

    // await
    await new Promise(async (resolve, reject) => {
      // done
      (await drive.files.export({
        fileId   : connect.file.id,
        mimeType : 'text/csv'
      }, {
        responseType : 'stream'
      })).data
        .on('end', resolve)
        .on('error', reject)
        .pipe(stream);
    });

    // parse csv
    return Object.keys(data[0]).map((key) => {
      // key/value
      return {
        key,
        value : data[0][key],
      };
    });
  }

  /**
   * fields action
   *
   * @param opts 
   * @param connect 
   */
  async syncAction(opts, connect, { page, model, form }) {
    // fix domain
    const domain = this.dashup.config.url.includes('.io') ? `https://dashup.io` : this.dashup.config.url;

    // create client
    const client = new google.auth.OAuth2(
      this.dashup.config.client,
      this.dashup.config.secret,
      `${domain}/connect/sheets`,
    );

    // set credentials
    client.setCredentials(connect.sheets.tokens);

    // drive
    const drive = google.drive({
      auth    : client,
      version : 'v3',
    });

    // data
    const data = [];
    
    // stream
    const stream = csv.parse({
      headers : true
    })
      .on('error', error => console.error(error))
      .on('data', (r) => data.push(r))
      .on('end', (rowCount: number) => console.log(`Parsed ${rowCount} rows`));

    // await
    await new Promise(async (resolve, reject) => {
      // done
      (await drive.files.export({
        fileId   : connect.file.id,
        mimeType : 'text/csv'
      }, {
        responseType : 'stream'
      })).data
        .on('end', resolve)
        .on('error', reject)
        .pipe(stream);
    });

    // get repo
    const formPage = await new Query({
      ...opts,
    }, 'page').findById(form);

    // identifier field
    const identifierField = (formPage.get('data.fields') || []).find((c) => c.uuid === connect.identifier);

    // loop data
    await Promise.all(data.map(async (item) => {
      // query model
      let actualItem = await new Query({
        ...opts,

        page,
        form,
        model,
      }, 'model').where({
        [identifierField.name || identifierField.uuid] : item[connect.fields[connect.identifier]],
      }).findOne();

      // actual item
      if (!actualItem) actualItem = new Model({});

      // set fields
      Object.keys(connect.fields).forEach((uuid) => {
        // set value
        actualItem.set(uuid, item[connect.fields[uuid]]);
      });

      // save model
      return actualItem.save({
        ...opts,

        page,
        form,
        model,
      });
    }));
  }
}