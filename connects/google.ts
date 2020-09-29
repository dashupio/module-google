
// import connect interface
import dotProp from 'dot-prop';
import { google } from 'googleapis';
import { Connect } from '@dashup/module';

/**
 * build address helper
 */
export default class GoogleConnect extends Connect {
  /**
   * construct google connector
   *
   * @param args 
   */
  constructor(...args) {
    // run super
    super(...args);
  }

  /**
   * returns connect type
   */
  get type() {
    // return connect type label
    return 'google';
  }

  /**
   * returns connect type
   */
  get title() {
    // return connect type label
    return 'Google';
  }

  /**
   * returns connect icon
   */
  get icon() {
    // return connect icon label
    return 'fab fa-google';
  }

  /**
   * returns connect data
   */
  get data() {
    // return connect data
    return {};
  }

  /**
   * returns object of views
   */
  get views() {
    // return object of views
    return {
      auth   : 'connect/google/auth',
      config : 'connect/google/config',
    };
  }

  /**
   * returns connect actions
   */
  get actions() {
    // return connect actions
    return {};
  }

  /**
   * returns category list for connect
   */
  get categories() {
    // return array of categories
    return ['auth'];
  }

  /**
   * returns connect descripton for list
   */
  get description() {
    // return description string
    return 'Google Connector';
  }

  /**
   * action method
   *
   * @param param0 
   * @param connect 
   * @param data 
   */
  async save({ req, dashup, sessionID }, connect) {
    // check dashup
    if (!dashup) return;
    
    // create client
    const client = new google.auth.OAuth2(
      connect.clientID,
      connect.clientSecret,
      `${this.dashup.config.url}/connect/google`,
    );

    // complete auth
    const { tokens } = await client.getToken(req.body.code || req.query.code);

    // set credentials
    client.setCredentials(tokens);

    // get profile
    const people = google.people({
      auth    : client,
      version : 'v1',
    });

    // get data
    const profile = (await people.people.get({
      resourceName : 'people/me',
      personFields : 'emailAddresses,names,photos',
    })).data;

    // emit message
    this.dashup.connection.rpc('create.auth', {
      name     : dotProp.get(profile, 'names.0.displayName'),
      email    : dotProp.get(profile, 'emailAddresses.0.value'),
      username : dotProp.get(profile, 'emailAddresses.0.value'),

      _hidden : {
        id   : profile.resourceName,
        etag : profile.etag,
        type : 'google',
        tokens,
      }
    }, connect, sessionID);
  }
}