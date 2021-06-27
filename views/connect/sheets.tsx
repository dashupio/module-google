
// import react
import bytes from 'bytes';
import moment from 'moment';
import { Select } from '@dashup/ui';
import { Button } from 'react-bootstrap';
import { windowPopup } from 'window-popup';
import React, { useState, useEffect } from 'react';

// connect sheets
const ConnectSheets = (props = {}) => {
  // use state
  const [sync, setSync] = useState(null);
  const [search, setSearch] = useState('');
  const [fields, setFields] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState(null);

  // struct
  const struct = props.getConnectStruct(props.connect.type);

  // on connect
  const onConnect = (e) => {
    // prevent
    e.preventDefault();
    e.stopPropagation();

    // check frontend
    if (typeof window === 'undefined') return;

    // client
    const client = struct?.data?.client;
  
    // redirect to google
    const redirect = `https://accounts.google.com/o/oauth2/auth?scope=${
      encodeURIComponent(`https://www.googleapis.com/auth/drive`)
    }&access_type=offline&response_type=code&approval_prompt=force&redirect_uri=${
      encodeURIComponent(`https://${window.location.hostname}/connect/sheets`)
    }&client_id=${client}&state=${props.page.get('_id')}:${props.connect.uuid}:${props.dashup.sessionID}`;

    // window popup
    windowPopup(500, 700, redirect, 'Connect Sheets');
  };

  // on sync
  const onSync = async () => {
    // set syncing
    setSyncing(true);

    // action
    await props.dashup.action({
      type   : 'connect',
      struct : 'sheets',
    }, 'sync', props.connect, {
      page  : props.page.get('_id'),
      form  : props.page.get('data.forms.0'),
      model : props.page.get('data.model') || props.page.get('_id'),
    });

    // set syncing
    setSyncing(false);
  };

  // on field
  const onField = (field, value) => {
    // get fields
    const fields = props.connect.fields || {};

    // set value
    fields[value] = field.key;

    // on conect
    props.setConnect('fields', fields);
  };

  // get field
  const getField = (field, fields) => {
    // return value
    return [...(fields)].map((f) => {
      // return fields
      return {
        label    : f.label || f.name,
        value    : f.uuid,
        selected : (props.connect.fields || {})[f.uuid] === field.key,
      };
    });
  };

  // get direction
  const getDirection = () => {
    // return value
    return [['Both Ways', 'both'], ['Sheets => Dashup only', 'sheets'], ['Dashup => Sheets only', 'dashup']].map((sync) => {
      // return channel
      return {
        label    : sync[0],
        value    : sync[1],
        selected : props.connect.direction === sync[1],
      };
    });
  };

  // get identifier
  const getIdentifier = (fields) => {
    // keys
    return Object.keys(props.connect.fields || {}).map((uuid) => {
      // get field
      const field = fields.find((f) => f.uuid === uuid);

      // return
      return field ? {
        label    : `${field.label || field.name} === ${props.connect.fields[uuid]}`,
        value    : field.uuid,
        selected : props.connect.identifier === field.uuid,
      } : null;
    }).filter((f) => f);
  };

  // use effect
  useEffect(() => {
    // check file
    if (props.connect.file) return;

    // run sheets
    props.dashup.action({
      type   : 'connect',
      struct : 'sheets',
    }, 'list', props.connect, {}).then((data) => {
      // set sheets
      setSpreadsheets((data || []).sort((a, b) => {
        // dates
        const aD = new Date(a.created_at);
        const bD = new Date(b.created_at);
  
        // sort
        if (aD > bD) return 1;
        if (aD < bD) return -1;
        return 0;
      }));
    })
  }, [props.connect?.sheets?.code]);

  // use effect
  useEffect(() => {
    // run sheets
    props.dashup.action({
      type   : 'connect',
      struct : 'sheets',
    }, 'fields', props.connect, {}).then((data) => {
      // set sheets
      setFields(data);
    });

    // sync
    props.dashup.socket.on(`connect.${props.connect.uuid}`, setSync);

    // remove listeners
    return () => {
      // remove listener
      props.dashup.socket.removeListener(`connect.${props.connect.uuid}`, setSync);
    };
  }, [props.connect?.file?.name]);

  // return jsx
  return (
    <>
      { props.connect.sheets ? (
        props.connect.file ? (
          <div className="card mb-3">
            <div className="card-body d-flex flex-row">
              <div className="text-overflow">
                <b>{ props.connect.file.name }</b>
                <small className="d-block">
                  Created { moment(props.connect.file.created_at).fromNow() },
                  Size { bytes(props.connect.file.size) }
                </small>
              </div>
            </div>
          </div>
        ) : (
          <div className="card mb-3">
            <div className="card-body">
              { !!loading || !spreadsheets ? (
                <div className="text-center">
                  <i className="h1 fa fa-spinner fa-spin my-5" />
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="input-group">
                      <input className="form-control" onKeyUp={ (e) => setSearch(e.target.value) } placeholder="Search..." />
                      <span className="input-group-text">
                        <i className="fa fa-search" />
                      </span>
                    </div>
                  </div>
                  { spreadsheets.map((sheet, i) => {
                    // return jsx
                    return (
                      <button key={ `sheet-${i}` } onClick={ (e) => props.setConnect('file', sheet) } className={ `card w-100 card-sm bg-white text-dark mb-2${`${sheet.name}`.includes(search) ? '' : ' d-none'}` }>
                        <div className="card-body d-flex flex-row">
                          <div className="text-overflow text-start">
                            <b>{ sheet.name }</b>
                            <small className="d-block">
                              Created { moment(sheet.created_at).fromNow() },
                              Size { bytes(sheet.size) }
                            </small>
                          </div>
                        </div>
                      </button>
                    );
                  }) }
                </>
              ) }
            </div>
          </div>
        )
      ) : (
        <div className="card mb-3">
          <div className="card-body">
            <button onClick={ (e) => onConnect(e) } className="btn btn-light bg-white">
              <i className="fab fa-google me-2" />
              Connect with Sheets
            </button>
          </div>
        </div>
      ) }

      { !!(props.connect.sheets && props.connect.file) && (
        <div className="card mb-3">
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">
                Select Direction
              </label>
              <Select options={ getDirection() } value={ getDirection().filter((f) => f.selected) } onChange={ (val) => props.setConnect('direction', val?.value) } />
            </div>
            <div className="mb-3">
              <label className="form-label">
                Select Identifier Field
              </label>
              <Select options={ getIdentifier(props.getFields()) } value={ getIdentifier(props.getFields()).filter((f) => f.selected) } onChange={ (val) => props.setConnect('identifier', val?.value) } />
            </div>
            
            { !!loading || !fields ? (
              <div className="text-center">
                <i className="h1 fa fa-spinner fa-spin my-5" />
              </div>
            ) : (
              fields.map((field, i) => {
                // return jsx
                return (
                  <div key={ `field-${field.key}` } className="card bg-white text-dark mb-2">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-6 d-flex align-items-center">
                          <div>
                            <b>{ field.key }</b>
                            <small className="d-block">{ field.value }</small>
                          </div>
                        </div>
                        <div className="col-6">
                          <Select options={ getField(field, props.getFields()) } value={ getField(field, props.getFields()).filter((f) => f.selected) } onChange={ (val) => onField(field, val?.value) } />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) }
            <div className="text-end">
              <Button variant="success" disabled={ syncing } onClick={ () => onSync() }>
                { syncing ? (sync ? `Synced ${sync.done} of ${sync.total}` : 'Syncing Data...') : 'Sync Data' }
              </Button>
            </div>

          </div>
        </div>
      ) }
    </>
  );
};

// export default
export default ConnectSheets;