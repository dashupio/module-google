
// import react
import { windowPopup } from 'window-popup';
import React, { useState, useEffect } from 'react';

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
  return (
    <div className="card mb-3">
      <div className="card-header">
        <b>Gmail Connector</b>
      </div>
      { props.connect.gmail ? (
        !loading && !!profile ? (
          <div className="card-body">
            Syncing with <b>{ profile.emailAddress }</b>
          </div>
        ) : (
          <div className="card-body text-center">
            <i className="mx-auto fa fa-spinner fa-spin my-5" />
          </div>
        )
      ) : (
        <div className="card-body">
          <button onClick={ (e) => onConnect(e) } className="btn btn-google">
            <i className="fab fa-google me-2" />
            Connect with Gmail
          </button>
        </div>
      ) }
    </div>
  );
};

// export default
export default ConnectGmail;