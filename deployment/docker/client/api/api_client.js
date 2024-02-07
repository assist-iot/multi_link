const express = require("express")
const {exec} = require("child_process")
const Ajv = require("ajv")
const fs = require("fs.promises")
const axios = require("axios")
const process = require("process")

const API_MULTILINK_CLIENT_PORT = process.env.API_MULTILINK_CLIENT_PORT ? process.env.API_MULTILINK_CLIENT_PORT : 8120

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const ajv = new Ajv({allErrors: true})

const version = "v1"

const regex = /^(?!.%*[\|\&;<>\*\?\$\(\)\[\]\{\}`\\'"\t\n\r]).*$/
const regexPattern = '^(?!.%*[|&;<>=*?$(){}\\[\\]`\'"\\t\\n\\r]).*$'

var CLIENT_STARTED=false


var schema_start_client
var schema_bond_parameters

async function readFilesAndSetGlobals(){
  try {
    schema_start_client = JSON.parse( await fs.readFile("schema_start_client.json", "utf-8"))
    schema_bond_parameters = JSON.parse( await fs.readFile("schema_bond_parameters.json", "utf-8"))
  } catch (error) {
    console.log(error)
  }
}

// Read with async function readFile that closes the file after read it, important with express/web server applications
readFilesAndSetGlobals()

const bond_parameters = [
  "active_slave",
  "ad_actor_key",
  "ad_actor_sys_prio",
  "ad_actor_system",
  "ad_aggregator",
  "ad_num_ports",
  "ad_partner_key",
  "ad_partner_mac",
  "ad_select",
  "ad_user_port_key",
  "all_slaves_active",
  "arp_all_targets",
  "arp_interval",
  "arp_ip_target",
  "arp_missed_max",
  "arp_validate",
  "downdelay",
  "fail_over_mac",
  "lacp_active",
  "lacp_rate",
  "lp_interval",
  "mii_status",
  "miimon",
  "min_links",
  "mode",
  "num_grat_arp",
  "num_unsol_na",
  "packets_per_slave",
  "peer_notif_delay",
  "primary",
  "primary_reselect",
  "queue_id",
  "resend_igmp",
  "slaves",
  "tlb_dynamic_lb",
  "updelay",
  "use_carrier",
  "xmit_hash_policy"
]


const schema_ping_test = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "ip": {
      "type": "string",
      "pattern": "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,6}:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    }
  },
  "required": ["ip"]
}

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

app.post(`/${version}/client/start`, async (req,res) => {
    try {
      // CLIENT_STARTED=true
      if (CLIENT_STARTED) {
        throw(
          {
            http_error_code: 403,
            error_log: `The client is already started, if you want to restart it then stop them first`
          }
        )
      }
      const validate = ajv.compile(schema_start_client)
      if(!validate(req.body)){
        throw(
          {
            http_error_code: 403,
            error_log: validate.errors
          }
        )
      }
      var data
      try {
        const url = req.body.server_api_url + "/v1/server/key"
        console.log(url)
        data = await axios.get(url)
      } catch (error) {
        throw({
          http_error_code: 503,
          error_log: error
        })
      }
      try {
      const bondInterface = Object.keys(req.body.bond)[0]
      const bondIpAddress = req.body.bond[bondInterface].ip_address
      const bonding_mode = req.body.bond[bondInterface].bonding.bonding_mode
      const primary = req.body.bond[bondInterface].bonding.primary
      const arp_ip_target = req.body.bond[bondInterface].bonding.arp_ip_target
      const arp_interval = req.body.bond[bondInterface].bonding.arp_interval
      const fail_over_mac = req.body.bond[bondInterface].bonding.fail_over_mac
      const slaves = req.body.bond[bondInterface].slaves

      command = `echo -e '${data.data.key}' >> /etc/openvpn/ta.key`
      await exec_command(command)
      console.log(data)
      command = `../create_bond.sh ${bondInterface} ${bonding_mode} ${primary} ${arp_ip_target} ${arp_interval} ${bondIpAddress} ${fail_over_mac}`
      await exec_command(command)
        // Object.keys(req.body.bond[bondInterface].slaves).forEach(async (tap, counter) => {
      for (const slave_index in slaves){
          // counter = counter + 1
          const slave = req.body.bond[bondInterface].slaves[slave_index]
          const counter = parseInt(slave_index) + 1
          const tap = `tap${counter}`
          const vpnServer=slave.ip_server
          const netmask = slave.netmask
          const interface = slave.hw_int
          command = `../openvpn_tap_config.sh ${counter} ${tap} ${vpnServer} 10.8.0.${counter} ${netmask} ${1190 + counter}`
          await exec_command(command)
          command = `../startbond_api.sh ${bondInterface} ${tap} ${interface} ${counter}`
          await exec_command(command)
      }
        res.send({
          status: "Client started ok"
        })
        CLIENT_STARTED=true
      } catch (error) {
        throw(
          {
            http_error_code: 500,
            error_log: error
          }
        )}
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

app.get(`/${version}/client/bond_params/:bond`, async(req,res) => {
  const bond = req.params.bond
  console.log(req.params.bond)
  try {
    if (!regex.test(bond)) {
      throw(
        {
          http_error_code: 403,
          error_log: `The value ${bond} contains chars not supported`
        }
      )
    }
    var data
    try {
      var command = `ls /sys/class/net/${bond}/bonding`
      data = await exec_command(command)
    } catch (error) {
      throw(
        {
          http_error_code: 404,
          error_log: `Interface '${bond}' don't found`
        })
    }
    try { 
      const features_name = data.split("\n")
      var obj = {}
      for (let index = 0; index < features_name.length -1 ; index++) {
        command = `cat /sys/class/net/${bond}/bonding/${features_name[index]}`
        console.log(command)
        data = await exec_command(command)
        obj[features_name[index]] = await data.replace("\n", "")
        console.log(data.replace("\n", ""))
      }
      res.send(obj)
    } catch (error) {
      throw(
        {
          http_error_code: 500,
          error_log: error
        })
    }    
  } catch (error) {
    res.status(error.http_error_code).send(error.error_log)
  }
})

async function apply_bond_parameters(bondInterface, params){
  const promises = Object.keys(params).map(async (key) => {
  if (!bond_parameters.includes(key)) {
    throw(`The key "${key}" is not included in the permited bond parameters list:\n${bond_parameters}`)
  }
  let value = params[key]
  
  command = `ip link set dev ${bondInterface} type bond ${key} ${value}`
  console.log(command)
  try {
    await exec_command(command)
  } catch (error) {
    console.log(error)
    throw(error)
  }
  })

  return Promise.all(promises).then(()=>{
    return "Changes applied correctly"
  }).catch( error => {
    return Promise.reject(error)
  })
}

app.put(`/${version}/client/bond_params/:bond`, async (req, res) => {
  const bondInterface = req.params.bond
  try {
    const validate = ajv.compile(schema_bond_parameters)
    if(!validate(req.body)){
      throw(
        {
          http_error_code: 400,
          error_log: validate.errors
        }
        )
    }
    if (!regex.test(bondInterface)) {
      throw(
        {
          http_error_code: 400,
          error_log: `"The parameter ${bondInterface} contains chars not supported"`
        })
    }
    try {
      const new_params = req.body
      const response = await apply_bond_parameters(bondInterface, new_params)
      console.log(response)
      res.send(response)
    } catch (error) {
      throw(
        {
        http_error_code: 404,
        error_log: error
        }
      )
    }
  } catch (error) {
    console.log(error)
    res.status(error.http_error_code).send(error.error_log)
  }
})

app.post(`/${version}/client/stop/:bond`, async (req,res)=>{
  const bondInterface = req.params.bond
  try {
    if (!regex.test(bondInterface)) {
      throw(
        {
          http_error_code: 400,
          error_log: `The value ${bondInterface} contains chars not supported`
        }
      )
    }
    var data
    try {
      var command = `cat /sys/class/net/${bondInterface}/bonding/slaves`
      data = await exec_command(command)
    } catch (error) {
      throw(
        {
          http_error_code: 404,
          error_log: `Interface ${bondInterface} not found`
        }
      )
    }
    try {
      data = data.replace(/(\r\n|\n|\r)/gm, "")
      const data_array = data.split(" ")
      await data_array.map(async (tap, counter) => {
        command = `../stopbond_api.sh ${bondInterface} ${tap} ${counter}`
        console.log(command)
        await exec_command(command)
      })
      command = `rm -r /etc/openvpn/*`
      await exec_command(command)
      command = `mkdir -p /etc/openvpn/client`
      await exec_command(command)
      res.send({
        success: "Client stopped"
      })
      CLIENT_STARTED=false  
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

app.get(`/${version}/client/status`, (req,res) => {
  res.send({
    client_running: CLIENT_STARTED
  })
})

app.get(`/${version}/api-export`, async (req,res) => {
  try {
    const data = await fs.readFile("openapi.json", "utf-8")
    res.send(
      JSON.parse(data)
    )
  } catch (error) {
    res.send(error.stack)
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

app.listen(API_MULTILINK_CLIENT_PORT)