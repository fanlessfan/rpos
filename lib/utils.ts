﻿/// <reference path="../typings/node/node.d.ts"/>
import { networkInterfaces } from 'os';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter} from "events";
import { Writable, Readable } from "stream";

var clc = require('cli-color');

module Utils {
  export enum logLevel {
    None = 0,
    Error = 1,
    Warn = 2,
    Info = 3,
    Debug = 4
  }

  class DummyProcess extends EventEmitter implements ChildProcess {
    stdin: Writable;
    stdout: Readable;
    stderr: Readable;
    pid: number;
    constructor() {
      this.stdin = new Writable();
      this.stderr = this.stdout = new DummyReadable();
    }
    kill(signal?: string) { };
    send(message: any, sendHandle?: any) { };
    disconnect() { };
  }
  
  class DummyReadable extends Readable {
    read(){return null;}
  }

  export static class utils {
    static getSerial() {
      // Extract serial from cpuinfo file
      var cpuserial = "0000000000000000";
      try {
        var f = utils.execSync('sudo cat /proc/cpuinfo').toString();
        cpuserial = f.match(/Serial[\t]*: ([0-9a-f]{16})/)[1];
      } catch (ex) {
        this.log.error("Failed to read serial : %s", ex.message);
        cpuserial = "ERROR000000000";
      }
      return cpuserial;
    }

    static getIpAddress(interfaceName: string, type?: string) {
      var address = null;
      type = type || "IPv4";
      var ni = networkInterfaces()[interfaceName] || [];
      for (var i = 0; i < ni.length; i++) {
        var nif = ni[i];
        if (nif.family == type)
          address = nif.address;
      }
      return address;
    }
    
    static notPi() {
      return /^win/.test(process.platform) || /^darwin/.test(process.platform);
    }
    
    static log = {
      level: logLevel.Error,
      error: function(message: string, ...args) {
        if (utils.log.level > logLevel.None) {
          message = clc.red(message);
          console.log.apply(this, [message, ...args]);
        }
      },
      warn: function(message: string, ...args) {
        if (utils.log.level > logLevel.Error) {
          message = clc.yellow(message);
          console.log.apply(this, [message, ...args]);
        }
      },
      info: function(message: string, ...args) {
        if (utils.log.level > logLevel.Warn)
          console.log.apply(this, [message, ...args]);
      },
      debug: function(message: string, ...args) {
        if (utils.log.level > logLevel.Info) {
          message = clc.green(message);
          console.log.apply(this, [message, ...args]);
        }
      }
    }
    static execSync(cmd: string) {
      utils.log.debug(["execSync('", cmd, "')"].join(''));
      return utils.notPi() ? "" : require('child_process').execSync(cmd);
    }
    static spawn(cmd: string, args?: string[], options?: {}): ChildProcess {
      utils.log.debug(`spawn('${ cmd }', [${ args.join() }], ${ options })`);
      if (utils.notPi()) {
        return new DummyProcess();
      }
      else {
        return spawn(cmd, args, options);
      }
    }

    static cleanup(callback: () => void) {
    
      // attach user callback to the process event emitter
      // if no callback, it will still exit gracefully on Ctrl-C
      callback = callback || (() => { });
      process.on('cleanup', callback);
    
      // do app specific cleaning before exiting
      process.on('exit', () => {
        process.emit('cleanup');
      });
    
      // catch ctrl+c event and exit normally
      process.on('SIGINT', () => {
        console.log('Ctrl-C...');
        process.exit(2);
      });
    
      //catch uncaught exceptions, trace, then exit normally
      process.on('uncaughtException', (e) => {
        utils.log.error('Uncaught Exception... : %s', e.stack);
        process.exit(99);
      });
    }
  };
}
var utils = Utils.utils;
export { utils, Utils.logLevel };