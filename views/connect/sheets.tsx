
// import react
import bytes from 'bytes';
import moment from 'moment';
import { windowPopup } from 'window-popup';
import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Stack, Button, Icon, TextField, MenuItem, Card, CardContent, CardHeader, Typography, LoadingButton, CardActions } from '@dashup/ui';

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
      form  : props.getForms()[0] ? props.getForms()[0].get('_id') : null,
      model : props.page.get('data.model') || props.page.get('_id'),
    });

    // reload
    props.page.emit('reload');

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

  // connect with sheets
  if (!props.connect.sheets) return (
    <Box py={ 2 }>
      <Button onClick={ (e) => onConnect(e) } variant="contained" startIcon={ (
        <Icon type="fab" icon="google" />
      ) }>
        Connect with Sheets
      </Button>
    </Box>
  );

  // no file
  if (!props.connect.file) return (
    <Card variant="outlined" sx={ {
      mt : 2,
    } }>
      <CardContent>
        <TextField
          value={ search }
          label="Search"
          onChange={ (e) => setSearch(e.target.value) }
          fullWidth

          sx={ {
            mb : 2,
          } }
        />
        { spreadsheets && spreadsheets.length ? (
          <Stack spacing={ 2 }>
            { (spreadsheets || []).map((sheet, i) => {
              // check search
              if (!`${sheet.name}`.includes(search)) return null;

              // return jsx
              return (
                <Card key={ `sheet-${i}` } variant="outlined" onClick={ (e) => props.setConnect('file', sheet) } sx={ {
                  cursor : 'pointer',
                } }>
                  <CardContent sx={ {
                    display       : 'flex',
                    alignItems    : 'center',
                    flexDirection : 'row',
                  } }>
                    <Box>
                      <Typography sx={ {
                        fontWeight : 'bold',
                      } }>
                        { sheet.name }
                      </Typography>
                    </Box>
                    <Box textAlign="right" ml="auto">
                      <Typography sx={ {
                        fontSize : 'small',
                      } }>
                        { `Created ${moment(sheet.created_at).fromNow()}` }
                      </Typography>
                      <Typography sx={ {
                        fontSize : 'small',
                      } }>
                        { `Size ${bytes(sheet.size)}` }
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            }) }
          </Stack>
        ) : (
          <Box py={ 2 } alignItems="center" justifyContent="center" display="flex">
            <CircularProgress />
          </Box>
        ) }
      </CardContent>
    </Card>
  );

  // return jsx
  return (
    <Card variant="outlined" sx={ {
      mt : 2,
    } }>
      <CardHeader
        title={ props.connect.file?.name }
        subtitle={ `Created ${moment(props.connect.file.created).fromNow()}` }
      />
      <CardContent>
        <TextField
          value={ props.connect.direction || '' }
          label="Direction"
          onChange={ (e) => props.setConnect('direction', e.target.value) }
          select
          fullWidth
        >
          { getDirection().map((option) => {
            // return jsx
            return (
              <MenuItem key={ option.value } value={ option.value }>
                { option.label }
              </MenuItem>
            )
          }) }
        </TextField>
        <TextField
          value={ props.connect.identifier || '' }
          label="Identifier"
          onChange={ (e) => props.setConnect('identifier', e.target.value) }
          select
          fullWidth
        >
          { getIdentifier(props.getFields()).map((option) => {
            // return jsx
            return (
              <MenuItem key={ option.value } value={ option.value }>
                { option.label }
              </MenuItem>
            )
          }) }
        </TextField>
        
        { (loading || !fields) ? (
          <Box py={ 2 } alignItems="center" justifyContent="center" display="flex">
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={ 2 } sx={ {
            mt : 2,
          } }>
            { fields.map((field, i) => {
              // return jsx
              return (
                <Card variant="outlined" key={ field.key }>
                  <CardContent sx={ {
                    display       : 'flex',
                    alignItems    : 'center',
                    flexDirection : 'row',
                  } }>
                    <Box>
                      <Typography sx={ {
                        fontWeight : 'bold',
                      } }>
                        { field.key }
                      </Typography>
                      <Typography sx={ {
                        fontSize : 'small',
                      } }>
                        { field.value }
                      </Typography>
                    </Box>
                    
                    <TextField
                      value={ getField(field, props.getFields()).find((f) => f.selected)?.value || '' }
                      label={ field.key }
                      onChange={ (e) => onField(field, e.target.value) }
                      select
                      sx={ {
                        ml       : 'auto',
                        minWidth : '50%',
                      } }
                    >
                      { getField(field, props.getFields()).map((option) => {
                        // return jsx
                        return (
                          <MenuItem key={ option.value } value={ option.value }>
                            { option.label }
                          </MenuItem>
                        )
                      }) }
                    </TextField>
                  </CardContent>
                </Card>
              );
            }) }
          </Stack>
        ) }
      </CardContent>
      <CardActions sx={ {
        justifyContent : 'end',
      } }>
        <LoadingButton color="success" variant="contained" disabled={ !!syncing } loading={ !!syncing } onClick={ () => onSync() }>
          { syncing ? (sync ? `Synced ${sync.done} of ${sync.total}` : 'Syncing Data...') : 'Sync Data' }
        </LoadingButton>
      </CardActions>
    </Card>
  );
};

// export default
export default ConnectSheets;