iptables -I INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT

iptables -I FORWARD  -m state --state RELATED,ESTABLISHED -j ACCEPT

sudo iptables -t nat -I POSTROUTING -o eth0 -j MASQUERADE
