Dashup Module Facebook
&middot;
[![Latest Github release](https://img.shields.io/github/release/dashup/module-facebook.svg)](https://github.com/dashup/module-facebook/releases/latest)
=====

A connect interface for facebook on [dashup](https://dashup.io).

## Contents
* [Get Started](#get-started)
* [Connect interface](#connect)

## Get Started

This facebook connector adds facebook login to Dashup frontend modules:

```json
{
  "url" : "https://dashup.io",
  "key" : "[dashup module key here]",
}
```

To start the connection to dashup:

`npm run start`

## Deployment

1. `docker build -t dashup/module-facebook .`
2. `docker run -d -v /path/to/.dashup.json:/usr/src/module/.dashup.json dashup/module-facebook`