#!/bin/bash

# the script needs to be called from the directory where
# the commonConfig file and the start/stop bridge files 
# are located

# arguments of the script:
# script.sh counter ip ipMask port
counter=$1
ipTrunk=$2
ipMask=$3
port=$4

# the config files will be called server1.conf, server2.conf aso

vpnConfigFile=/etc/openvpn/server/server${counter}.conf
cp ../config/server.conf.template $vpnConfigFile

# now we just replace the placeholders in the template file
# @tap is replaced with tap0, tap1 etc.

sed -i s/@dev/tap${counter}/g $vpnConfigFile
pwd
echo "ipTrunk = ${ipTrunk}"
echo "ipMask = ${ipMask}"
echo "port = ${port}"

# we dont need ip addresses for the tap interfaces as they are bridged

sed -i s/@ip/"${ip}"/g $vpnConfigFile
sed -i s/@mask/$ipMask/g $vpnConfigFile

# we replace the @port placeholder with ports 1191, 1192, 1193 and so on

sed -i s/@port/${port}/g $vpnConfigFile

# enable the corresponding system unit

if (systemctl is-enabled openvpn-server@server${counter}.service); then 
      systemctl disable openvpn-server@server${counter}.service
fi

# enable ip4 forwarding with sysctl
sysctl -w net.ipv4.ip_forward=1

# --- print out the content of sysctl.conf
sysctl -p

