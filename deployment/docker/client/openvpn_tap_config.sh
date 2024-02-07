#!/bin/bash

# #############################################
#
# install.sh - run as root.
#
# installs openvpn, openssl and bridge-utils
#
# you need to have a client key ready
# in /etc/openvpn/ta.key
#
# creates n client configs with tap bridging
#
# #############################################

# the script needs to be called from the directory where
# the commonConfig file and the start/stop bridge files 
# are located

# arguments of the script:
# script.sh counter tap vpnServer ipTrunk ipMask port
counter=$1
tap=$2
vpnServer=$3
ipTrunk=$4
ipMask=$5
port=$6

# the config files will be called server1.conf, server2.conf aso

vpnConfigFile=/etc/openvpn/client/client${counter}.conf
cp ../config/client.conf.template $vpnConfigFile

# now we just replace the placeholders in the template file
# @tap is replaced with tap0, tap1 etc.

# sed -i s/@dev/tap${counter}/g $vpnConfigFile
sed -i s/@dev/${tap}/g $vpnConfigFile
sed -i s/@server/${vpnServer}/g $vpnConfigFile

echo "vpnServer = ${vpnServer}"
echo "ipTrunk = ${ipTrunk}"
echo "ipMask = ${ipMask}"
echo "port = ${port}"

# we dont need ip addresses for the tap interfaces as they are bridged

sed -i s/@ip/"${ipTrunk}.${counter}"/g $vpnConfigFile
sed -i s/@mask/$ipMask/g $vpnConfigFile

# we replace the @port placeholder with ports 1191, 1192, 1193 and so on

sed -i s/@port/${port}/g $vpnConfigFile

# now add a routing table for each interface
# but keep it commented out until the bond is actually started
# we will start enumerating the routing tables at 11,
# i.e. add 10 to the number of the table
# so this will result in #11 vpn1, #12 vpn2 and so on
# needed to make this a bit more complicated because someone
# might run the install multiple times

# case 1 - the table already exists, then we comment it out
if grep "^1${counter} vpn${counter}" /etc/iproute2/rt_tables  
then
    sed -i s/"^1${counter} vpn${counter}"/"#1${counter} vpn${counter}"/g /etc/iproute2/rt_tables
else    
    # case 2 - the table does not exist, then we add it
    if ! grep "1${counter}.*vpn${counter}" /etc/iproute2/rt_tables
    then
        echo "#1${counter} vpn${counter}" >>/etc/iproute2/rt_tables
    fi
fi


echo "the routing table is as follows:"
cat /etc/iproute2/rt_tables


