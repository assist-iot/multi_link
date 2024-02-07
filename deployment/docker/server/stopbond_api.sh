#!/bin/bash

# script.sh bondInterface counter
# script.sh br0 10.8.0.254 1

# bondInterface=$1
tap=$1
i=$2
# disconnect the VPN connections and remove the tap interfaces

pkill openvpn
ip route del default table "vpn$i"
ip rule del table "vpn$i"
openvpn --rmtun --dev $tap


