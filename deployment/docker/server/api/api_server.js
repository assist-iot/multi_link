const express = require("express")
const {exec} = require("child_process")
const Ajv = require("ajv")
const fs = require("fs.promises")
const process = require("process")

const API_MULTILINK_SERVER_PORT = process.env.API_MULTILINK_SERVER_PORT ? process.env.API_MULTILINK_SERVER_PORT : 8121

const app = express()
app.use(express.json())

const ajv = new Ajv({allErrors: true})

const regex = /^(?!.%*[\|\&;<>\*\?\$\(\)\[\]\{\}`\\'"\t\n\r]).*$/
const regexPattern = '^(?!.%*[|&;<>=*?$(){}\\[\\]`\'"\\t\\n\\r]).*$'

const version = "v1"

var SERVER_STARTED=false

var schema_start_server
var schema_ping_test

async function readFilesAndSetGlobals(){
  try {
    schema_start_server = JSON.parse( await fs.readFile("schema_start_server.json", "utf-8"))
    schema_ping_test = JSON.parse( await fs.readFile("schema_ping_test.json", "utf-8"))
  } catch (error) {
    console.log(error)
  }
}

// Read with async function readFile that closes the file after read it, important with express/web server applications
readFilesAndSetGlobals()

function exec_command(command){
  return new Promise((resolve,reject) => {
    exec(command, (error,stdout, stderr) => {
      if (error) {
        reject(error.stack)
      }else{
        resolve(stdout)
      }
    })
  })
}

app.get(`/${version}/server/key`, async (req,res) => {
  try {
    const data = await fs.readFile("/etc/openvpn/ta.key", {encoding: "utf-8", flag: "r"})
    res.send({
      key: data
    })
  } catch (error) {
    res.status(500).send({
      error: "Error sending the key of the tap tunnels",
      error_log: error
    })
  }
})

app.post(`/${version}/server/start`, async (req,res) => {
  try {
    if (SERVER_STARTED) {
      throw(
        {
          http_error_code: 409,
          error_log: `The server is already started, if you want to restart it, first stop them`
        }
      )
    }
    const validate = ajv.compile(schema_start_server)
    if(!validate(req.body)){
      throw(
        {
          http_error_code: 400,
          error_log: validate.errors
        }
      )
    }
    try {
      const bondInterface = req.body.bridge_interface
      const bondIP = req.body.bridge_ip
      const tap_n = req.body.links
      var command = `../create_key.sh`
      await exec_command(command, res)
      command = `../create_and_config_bond.sh ${bondInterface} ${bondIP}`
      await exec_command(command)
      for (let index = 1; index <= tap_n; index++) {
        // create_and_config_bond.sh counter ip ipMask port
        command = `../openvpn_tap_config.sh ${index} 10.8.0.${index} 255.255.255.0 ${1190 + index}`
        await exec_command(command)
        command = `../startbond_api.sh ${bondInterface} ${index}`
        await exec_command(command)
      }
      res.send("Server started successfully!")
      SERVER_STARTED=true
    } catch (error) {
      throw(
        {
          http_error_code: 500,
          error_log: error
        }
      )
    }
  } catch (error) {
    console.log(error)
    res.status(error.http_error_code).send(error.error_log)
  }
})

app.get(`/${version}/server/status`, (req,res) => {
  res.send({
    server_running: SERVER_STARTED 
  })
})

app.post(`/${version}/ping_test`, async (req,res) =>{
  try {
    console.log(req.body)
    const validate = await ajv.compile(schema_ping_test)
    if(!validate(req.body)){
      throw({
        http_error_code: 400,
        error_log: validate.errors
      })
    }
    var ip
    try {
      ip = req.body.ip
      var command = `ping -c 5 ${ip}`
      let data = await exec_command(command)
      res.send({
        ping_log: data
      })
    } catch (error) {
      throw({
        http_error_code: 404,
        error_log: `Ping ${ip} failed`
      })
    }
  } catch (error) {
    console.log(error)
    res.status(error.http_error_code).send(error.error_log)
  }
})

app.post (`/${version}/tap_down/:tap`, async (req,res) => {
  try {
    const tap = req.params.tap
    if (!regex.test(tap)) {
      throw(
        {
          http_error_code: 403,
          error_log: `The value ${tap} contains chars not supported`
        })
    }
    try {
      command = `ifconfig ${tap} down`
      await exec_command(command)
      res.send({
        log: `Succesfully bring down interface ${tap}`
      })
    } catch (error) {
      throw(
        {
          http_error_code: 404,
          error_log: `The tap interface ${tap} don't exist`
        }
      )
    }
  } catch (error) {
    res.status(error.http_error_code).send(error.error_log)
  }
})

app.post (`/${version}/tap_up/:tap`, async (req,res) => {
  try {
    const tap = req.params.tap
    if (!regex.test(tap)) {
      throw(
        {
          http_error_code: 403,
          error_log: `The value ${tap} contains chars not supported`
        })
    }
    try {
      command = `ifconfig ${tap} up`
      await exec_command(command)
      res.send({
        log: `Succesfully bring up interface ${tap}`
      })
    } catch (error) {
      throw(
        {
          http_error_code: 404,
          error_log: `The tap interface ${tap} don't exist`
        }
      )
    }
  } catch (error) {
    res.status(error.http_error_code).send(error.error_log)
  }
})

app.post(`/${version}/server/stop/:bridge`, async (req,res) => {
  try {
    const bondInterface = req.params.bridge
    if (!regex.test(bondInterface)) {
      throw(
        {
          http_error_code: 400,
          error_log: `The parameter ${bondInterface} contains chars not supported`
        })
    }
    try {
      var command = `brctl show ${bondInterface} | grep -Eo '(tap)\\w'`
      console.log(command)
      var data = await exec_command(command)
      console.log(data)
    } catch (error) {
      throw(
        {
          http_error_code: 404,
          error_log: `Interface ${bondInterface} not found`
        })
    }
    try {
      data = data.replace(/(\r\n|\n|\r)/gm, " ")
      console.log(data)
      var data_array = data.split(" ")
      data_array.pop()
      console.log(data_array)
      command = `ip link del ${bondInterface}`
      console.log(command)
      await exec_command(command)
      await data_array.map(async (tap, index) => {
        command = `../stopbond_api.sh ${tap} ${index}`
        console.log(command)
        await exec_command(command)
      })
      res.send("Server stopped successfully!")
      SERVER_STARTED=false
    } catch (error) {
      throw(
        {
          http_error_code: 500,
          error_log: error
        })
    }
    
  } catch (error) {
    console.log(error)
    res.status(error.http_error_code).send(error.error_log)
  }
})

app.get(`/${version}/api-export`, async (req,res) => {
  try {
    const data = await fs.readFile("openapi.json", "utf-8")
    res.send(
      JSON.parse(data)
    )
  } catch (error) {
    res.status(500).send({
      error: "Error sending the openapi definition",
      error_log: error
    })
  }
})

app.get("/version", (req,res) => {
  res.send({
    version: version
  })
})

app.get("/health", (req,res) => {
  res.send({
    health: "healthy"
  })
})

app.listen(API_MULTILINK_SERVER_PORT)