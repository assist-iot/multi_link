#!/bin/bash

# #############################################
#
# stopbond.sh
#
# disconnects the VPN,
# removes the tap devices 
# and the bond interface
#
# #############################################

bondInterface=$1
tap=$2
i=$3


ip link set $bondInterface down
ip link del $bondInterface

# disconnect the VPN connections and remove the tap interfaces

pkill openvpn

# deletes routes and tunnels
ip route del default table "vpn$i"
ip rule del table "vpn$i"
openvpn --rmtun --dev $tap
