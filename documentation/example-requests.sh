#################################### SERVER ####################################

# start server
curl -X POST http://localhost:3333/v1/server/start -H 'Content-Type: application/json' -d @- << EOF
{
  "bridge_interface": "br0",
  "bridge_ip": "10.8.0.254",
  "links": "2"
}
EOF

# get server key
curl http://localhost:3333/v1/server/key

# stop server
curl -X POST http://localhost:3333/v1/server/stop/br0

# get server status
curl http://localhost:3333/v1/server/status

#################################### CLIENT ####################################

# start client
curl -X POST http://localhost:3333/v1/client/start -H 'Content-Type: application/json' -d @- << EOF
{
  "server_api_url": "http://158.42.89.111:3333",
  "bond":{
    "bond0": {
      "ip_address": "10.8.0.253",
      "slaves": [
        {
          "hw_int": "eth0",
          "ip_server": "158.42.89.111",
          "netmask": "255.255.255.0"
        },
        {
          "hw_int": "wlan0",
          "ip_server": "192.168.150.100",
          "netmask": "255.255.255.0"
        }
      ],
      "bonding": {
        "bonding_mode": "1",
        "primary": "tap1",
        "arp_ip_target": "10.8.0.254",
        "arp_interval": "100",
        "fail_over_mac": "1",
        "arp_validate": "5"
      }
    }  
  }  
}
EOF

# client status
curl http://localhost:3333/v1/client/status

# stop client
curl -X POST http://localhost:3333/v1/client/stop/bond0

# change bond params
curl -X PUT http://localhost:3333/v1/client/bond_params/bond0 -H 'Content-Type: application/json' -d @- <<EOF
{
  "primary": "tap2",
  "arp_interval": "20"
}
EOF

# get bond config
curl http://localhost:3333/v1/client/bond_params/bond0

#################################### COMMON ENDPOINTS ####################################

# bring down tap1
curl -X POST http://localhost:3333/v1/tap_down/tap1

# bring down tap2
curl -X POST http://localhost:3333/v1/tap_down/tap2

# bring up tap1
curl -X POST http://localhost:3333/v1/tap_up/tap1

# bring up tap2
curl -X POST http://localhost:3333/v1/tap_up/tap2

# ping test
curl -X POST http://localhost:3333/v1/ping_test -H 'Content-Type: application/json' -d @- << EOF
{
  "ip": "10.8.0.254"
}
EOF

# get api-export
curl http://localhost:3333/v1/api-export

# get version
curl http://localhost:3333/version

# get health
curl http://localhost:3333/health