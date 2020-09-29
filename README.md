Dashup Module Google
&middot;
[![Latest Github release](https://img.shields.io/github/release/dashup/module-google.svg)](https://github.com/dashup/module-google/releases/latest)
=====

A connect interface for google on [dashup](https://dashup.io).

## Contents
* [Get Started](#get-started)
* [Connect interface](#connect)

## Get Started

This google connector adds google login to Dashup frontend modules:

```json
{
  "url" : "https://dashup.io",
  "key" : "[dashup module key here]",
}
```

To start the connection to dashup:

`npm run start`

## Deployment

1. `docker build -t dashup/module-google .`
2. `docker run -d -v /path/to/.dashup.json:/usr/src/module/.dashup.json dashup/module-google`