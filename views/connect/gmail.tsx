
// import react
import { windowPopup } from 'window-popup';
import React, { useState, useEffect } from 'react';
import { Box, Button, Icon, Typography } from '@dashup/ui';

// connect sheets
const ConnectGmail = (props = {}) => {
  // use state
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(false);

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
      encodeURIComponent(`https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly`)
    }&access_type=offline&response_type=code&approval_prompt=force&redirect_uri=${
      encodeURIComponent(`https://${window.location.hostname}/connect/gmail`)
    }&client_id=${client}&state=${props.page.get('_id')}:${props.connect.uuid}:${props.dashup.sessionID}`;

    // window popup
    windowPopup(500, 700, redirect, 'Connect Gmail');
  };

  // use effect
  useEffect(() => {
    // check gmail
    if (!props.connect.gmail) return;

    // run sheets
    props.dashup.action({
      type   : 'connect',
      struct : 'gmail',
    }, 'profile', props.connect, {}).then(setProfile);
  }, [props.connect.gmail]);

  // return jsx
  return props.connect.gmail ? (
    <Typography variant="h5">
      { `Syncing with ${profile?.emailAddress || 'Loading...'}` }
    </Typography>
  ) : (
    <Box py={ 2 }>
      <Button onClick={ (e) => onConnect(e) } variant="contained" startIcon={ (
        <Icon type="fab" icon="google" />
      ) }>
        Connect with Gmail
      </Button>
    </Box>
  );
};

// export default
export default ConnectGmail;