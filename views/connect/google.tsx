
// import react
import React from 'react';

// connect sheets
const ConnectGoogle = (props = {}) => {

  // return jsx
  return (
    <div className="card mb-3">
      <div className="card-header">
        <b>Google Connector</b>
      </div>
      <div className="card-body">

        <div className="mb-3">
          <label className="form-label">
            Redirect URI
          </label>
          <input className="form-control disabled" value={ typeof window !== 'undefined' && `https://${window.location.hostname}/connect/google` } disabled />
        </div>

        <div className="mb-3">
          <label className="form-label">
            App ID
          </label>
          <input className="form-control" name="client-id" ref="client-id" value={ props.connect.clientID } onChange={ (e) => props.setConnect('clientID', e.target.value) } />
        </div>

        <div className="mb-3">
          <label className="form-label">
            App Secret
          </label>
          <input className="form-control" name="client-secret" ref="client-secret" value={ props.connect.clientSecret } onChange={ (e) => props.setConnect('clientSecret', e.target.value) } />
        </div>

      </div>
    </div>
  );
};

// export default
export default ConnectGoogle;