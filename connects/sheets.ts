
// import connect interface;
import fetch from 'node-fetch';
import chunk from 'chunk';
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
      config : 'connect/sheets',
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
    const domain = this.dashup.config.url.includes('_front') ? `https://dashup.io` : this.dashup.config.url;
    
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
    const domain = this.dashup.config.url.includes('_front') ? `https://dashup.io` : this.dashup.config.url;

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

    // List files
    const { data } = await drive.files.list({
      q        : `(mimeType='application/vnd.google-apps.spreadsheet') and trashed=false`,
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
        exports    : file.exportLinks,
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
    const domain = this.dashup.config.url.includes('_front') ? `https://dashup.io` : this.dashup.config.url;

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
      headers                : true,
      maxRows                : 1,
      strictColumnHandling   : false,
      discardUnmappedColumns : true,
    })
      .on('error', error => console.error(error))
      .on('data', (r) => data.push(r))
      .on('end', (rowCount: number) => console.log(`Parsed ${rowCount} rows`));

    // await
    await new Promise(async (resolve, reject) => {
      // done
      (await drive.files.export({
        alt      : 'media',
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
    const domain = this.dashup.config.url.includes('_front') ? `https://dashup.io` : this.dashup.config.url;

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
      headers                : true,
      strictColumnHandling   : false,
      discardUnmappedColumns : true,
    })
      .on('error', error => console.error(error))
      .on('data', (r) => data.push(r))
      .on('end', (rowCount: number) => console.log(`Parsed ${rowCount} rows`));

    // await
    await new Promise(async (resolve, reject) => {
      // done
      (await drive.files.export({
        alt      : 'media',
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

    // split into a few
    const chunks = chunk(data, 250);

    // log
    console.log(`syncing ${chunks.length} chunks`);

    // loop chunks
    for (let i = 0; i < chunks.length; i++) {
      // chunk
      const chunk = chunks[i];

      // do bulk update
      await this.dashup.connection.rpc({
        ...opts,

        page,
        form,
        model,
      }, 'model.bulk', {
        type       : 'updateOrCreate',
        query      : [],
        identifier : identifierField.name || identifierField.uuid,
      }, chunk.map((item) => {
        // update item
        const update = {};

        // set fields
        Object.keys(connect.fields).forEach((uuid) => {
          // set value
          update[uuid] = item[connect.fields[uuid]];
        });

        // return update
        return update;
      }));

      // emit to socket
      this.dashup.connection.rpc({
        ...opts,
      }, 'socket.emit', `connect.${connect.uuid}`, {
        page  : (i + 1),
        done  : chunk.length + (i * 100),
        total : data.length,
        pages : chunks.length,
      });

      // log
      console.log(`synced ${(i + 1)}/${chunks.length} chunks`);
    }

    // return true
    return true;
  }
}