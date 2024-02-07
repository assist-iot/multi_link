#!/bin/bash

# script.sh bondInterface counter
# script.sh br0 10.8.0.254 1

bondInterface=$1
i=$2

# include the common settings
# . /etc/openvpn/commonConfig

# create tap interfaces and enslave them to bond interface


openvpn --mktun --dev tap${i}
ip link set tap${i} master $bondInterface


# add routing tables, bind the tap interfaces to
# the corresponding ip address of the interfaces

openvpn --config /etc/openvpn/server/server${i}.conf --daemon

export OUR_OWN_IP=`curl -s ipinfo.io/ip`
readarray -d " " -t templine <<< $(ip -br addr | grep $OUR_OWN_IP)
export OUR_WAN_INTERFACE=${templine[0]}


if [ ${#OUR_WAN_INTERFACE} -le 2 ]; then
    echo "WAN Interface not found - was:${OUR_WAN_INTERFACE}:"
    export OUR_WAN_INTERFACE=`ip route | grep default | sed s/.*dev\ //g | sed s/\ .*//g`
    echo "WAN Interface is now: $OUR_WAN_INTERFACE"
fi

# quick fix : IP V4 forwarding is not permanent

sysctl -w net.ipv4.ip_forward=1

# now add the masquerading rules

iptables -A FORWARD -i "$bondInterface" -j ACCEPT
iptables -A FORWARD -o "$bondInterface" -j ACCEPT
iptables -t nat -A POSTROUTING -o "$OUR_WAN_INTERFACE" -j MASQUERADE

# Bring up the tap interfaces
ifconfig tap${i} up
