#!/bin/bash

# #############################################
#
# startbond.sh
#
# creates multiple tap devices
# and bonds them together
#
# #############################################

# script.sh bondInterface hw_interface tap_interface_number
# script.sh bond0 tap1 eth0 1

bondInterface=$1
tap=$2
interface=$3
i=$4

# include the common settings
# . /etc/openvpn/commonConfig

# create tap interfaces and enslave them to bond interface

openvpn --mktun --dev $tap
ip link set $tap master $bondInterface


# add routing tables, bind the tap interfaces to
# the corresponding ip address of the interfaces


# read the interface name from the config section

tunnelInterface=${interface}
configFileName="/etc/openvpn/client/client$i.conf"

echo "###########################################"
echo "adding routing table vpn${i}"
echo Tunnel Interface $i is ${!tunnelInterface}

# comment out the rule in the iproute2 routing table

sed -i s/"^#1${i} vpn${i}"/"1${i} vpn${i}"/g /etc/iproute2/rt_tables

# find the ip address of this interface

readarray -td " " templine <<< $(ip -br addr | grep $tunnelInterface | sed  's/ \+/ /g')
tunnelInterfaceIP=${templine[2]}
echo "with IP address ${tunnelInterfaceIP}"

# read default gateway from the main table

readarray -td " " templine <<< $(ip -br route | grep $tunnelInterface | grep default)
tunnelInterfaceGW=${templine[2]}

# check if default gateway is a ppp interface and modify it accordingly (bug fix)

if [[ $tunnelInterfaceGW == ppp* ]]
then
    readarray -td " " templine <<< $(ip -br route | grep ${!tunnelInterface} | grep src)
    tunnelInterfaceGW=${templine[0]}
fi

# add a rule for this interface

ip rule add pref 10 from $tunnelInterfaceIP table vpn$i
# Only needed if we want to make the bond the default route
# ip route add default via $tunnelInterfaceGW dev $tunnelInterface table vpn$i


# make sure that each connection binds to the right interface

sed -i /^local.*/d $configFileName
echo "local $tunnelInterfaceIP" | sed s@/.*@@g >>$configFileName

# # start openvpn as a daemon

openvpn --daemon --config $configFileName


