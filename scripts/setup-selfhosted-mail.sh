#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-redcoreos.net}"
MAIL_HOST="${MAIL_HOST:-redcoreos.net}"
MAIL_FQDN="${MAIL_FQDN:-mail.${DOMAIN}}"
MAIL_ROOT="${MAIL_ROOT:-/srv/mailboxes}"
CERT_BASE="${CERT_BASE:-/etc/letsencrypt/live/${MAIL_HOST}}"
CERT_FILE="${CERT_FILE:-${CERT_BASE}/fullchain.pem}"
KEY_FILE="${KEY_FILE:-${CERT_BASE}/privkey.pem}"
DKIM_SELECTOR="${DKIM_SELECTOR:-mail}"
MAIL_USERS=(info support noreply)

if [[ $EUID -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y postfix dovecot-core dovecot-imapd mailutils opendkim opendkim-tools

mkdir -p "${MAIL_ROOT}"

for user in "${MAIL_USERS[@]}"; do
  if ! id "${user}" >/dev/null 2>&1; then
    useradd -m -d "${MAIL_ROOT}/${user}" -s /usr/sbin/nologin "${user}"
  fi
  mkdir -p "${MAIL_ROOT}/${user}"
  chown -R "${user}:${user}" "${MAIL_ROOT}/${user}"
  chmod 700 "${MAIL_ROOT}/${user}"
done

INFO_PASS="$(openssl rand -base64 24 | tr -d '\n')"
SUPPORT_PASS="$(openssl rand -base64 24 | tr -d '\n')"
NOREPLY_PASS="$(openssl rand -base64 24 | tr -d '\n')"
printf 'info:%s\nsupport:%s\nnoreply:%s\n' "${INFO_PASS}" "${SUPPORT_PASS}" "${NOREPLY_PASS}" | chpasswd

install -m 600 -o root -g root /dev/null /root/redcore-mail-credentials.txt
cat >/root/redcore-mail-credentials.txt <<CREDS
redcore self-hosted mail credentials
domain: ${DOMAIN}
imap host: ${MAIL_HOST}
smtp host: ${MAIL_HOST}
imap ssl port: 993
smtp submission port: 587
info: ${INFO_PASS}
support: ${SUPPORT_PASS}
noreply: ${NOREPLY_PASS}
CREDS

postconf -e "myhostname = ${MAIL_FQDN}"
postconf -e "mydomain = ${DOMAIN}"
postconf -e 'myorigin = $mydomain'
postconf -e 'mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain'
postconf -e 'inet_interfaces = all'
postconf -e 'inet_protocols = all'
postconf -e 'home_mailbox = Maildir/'
postconf -e 'smtpd_banner = $myhostname ESMTP'
postconf -e 'append_dot_mydomain = no'
postconf -e 'biff = no'
postconf -e 'readme_directory = no'
postconf -e 'compatibility_level = 3.6'
postconf -e "smtpd_tls_cert_file = ${CERT_FILE}"
postconf -e "smtpd_tls_key_file = ${KEY_FILE}"
postconf -e 'smtpd_tls_security_level = may'
postconf -e 'smtp_tls_security_level = may'
postconf -e 'smtpd_tls_auth_only = yes'
postconf -e 'smtpd_sasl_auth_enable = yes'
postconf -e 'smtpd_sasl_type = dovecot'
postconf -e 'smtpd_sasl_path = private/auth'
postconf -e 'smtpd_recipient_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination'
postconf -e 'milter_default_action = accept'
postconf -e 'milter_protocol = 6'
postconf -e 'smtpd_milters = inet:localhost:12301'
postconf -e 'non_smtpd_milters = inet:localhost:12301'
postconf -e 'mailbox_size_limit = 0'
postconf -e 'recipient_delimiter = +'
postconf -e 'alias_maps = hash:/etc/aliases'
postconf -e 'alias_database = hash:/etc/aliases'

cat >/etc/postfix/master.cf <<'MASTER'
# Postfix master process configuration file.
smtp      inet  n       -       y       -       -       smtpd
pickup    unix  n       -       y       60      1       pickup
cleanup   unix  n       -       y       -       0       cleanup
qmgr      unix  n       -       n       300     1       qmgr
tlsmgr    unix  -       -       y       1000?   1       tlsmgr
rewrite   unix  -       -       y       -       -       trivial-rewrite
bounce    unix  -       -       y       -       0       bounce
defer     unix  -       -       y       -       0       bounce
trace     unix  -       -       y       -       0       bounce
verify    unix  -       -       y       -       1       verify
flush     unix  n       -       y       1000?   0       flush
proxymap  unix  -       -       n       -       -       proxymap
proxywrite unix -       -       n       -       1       proxymap
smtp      unix  -       -       y       -       -       smtp
relay     unix  -       -       y       -       -       smtp
showq     unix  n       -       y       -       -       showq
error     unix  -       -       y       -       -       error
retry     unix  -       -       y       -       -       error
discard   unix  -       -       y       -       -       discard
local     unix  -       n       n       -       -       local
virtual   unix  -       n       n       -       -       virtual
lmtp      unix  -       -       y       -       -       lmtp
anvil     unix  -       -       y       -       1       anvil
scache    unix  -       -       y       -       1       scache
postlog   unix-dgram n  -       n       -       1       postlogd

submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_relay_restrictions=permit_sasl_authenticated,reject
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
  -o smtpd_tls_auth_only=yes

smtps     inet  n       -       y       -       -       smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_relay_restrictions=permit_sasl_authenticated,reject
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
  -o smtpd_tls_auth_only=yes
MASTER

cat >/etc/dovecot/conf.d/10-mail.conf <<'DOVECOT_MAIL'
mail_location = maildir:~/Maildir
namespace inbox {
  inbox = yes
}
mail_privileged_group = mail
DOVECOT_MAIL

cat >/etc/dovecot/conf.d/10-auth.conf <<'DOVECOT_AUTH'
disable_plaintext_auth = yes
auth_mechanisms = plain login
!include auth-system.conf.ext
DOVECOT_AUTH

cat >/etc/dovecot/conf.d/10-master.conf <<'DOVECOT_MASTER'
service imap-login {
  inet_listener imap {
    port = 0
  }
  inet_listener imaps {
    port = 993
    ssl = yes
  }
}

service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
DOVECOT_MASTER

cat >/etc/dovecot/conf.d/10-ssl.conf <<DOVECOT_SSL
ssl = required
ssl_cert = <${CERT_FILE}
ssl_key = <${KEY_FILE}
DOVECOT_SSL

cat >/etc/dovecot/dovecot.conf <<'DOVECOT_MAIN'
protocols = imap
!include_try /usr/share/dovecot/protocols.d/*.protocol
!include conf.d/*.conf
!include_try local.conf
DOVECOT_MAIN

mkdir -p "/etc/opendkim/keys/${DOMAIN}"
cat >/etc/opendkim.conf <<'OPENDKIM'
Syslog                  yes
UMask                   002
Canonicalization        relaxed/simple
Mode                    sv
SubDomains              no
OversignHeaders         From
KeyTable                /etc/opendkim/key.table
SigningTable            refile:/etc/opendkim/signing.table
ExternalIgnoreList      /etc/opendkim/trusted.hosts
InternalHosts           /etc/opendkim/trusted.hosts
Socket                  inet:12301@localhost
PidFile                 /run/opendkim/opendkim.pid
UserID                  opendkim
OPENDKIM
cat >/etc/opendkim/trusted.hosts <<TRUSTED
127.0.0.1
localhost
*.${DOMAIN}
TRUSTED
cat >/etc/opendkim/key.table <<KEYTABLE
${DKIM_SELECTOR}._domainkey.${DOMAIN} ${DOMAIN}:${DKIM_SELECTOR}:/etc/opendkim/keys/${DOMAIN}/${DKIM_SELECTOR}.private
KEYTABLE
cat >/etc/opendkim/signing.table <<SIGNING
*@${DOMAIN} ${DKIM_SELECTOR}._domainkey.${DOMAIN}
SIGNING

if [[ ! -f "/etc/opendkim/keys/${DOMAIN}/${DKIM_SELECTOR}.private" ]]; then
  opendkim-genkey -b 2048 -d "${DOMAIN}" -D "/etc/opendkim/keys/${DOMAIN}" -s "${DKIM_SELECTOR}" -v
fi
chown -R opendkim:opendkim "/etc/opendkim/keys/${DOMAIN}"
chmod 700 "/etc/opendkim/keys/${DOMAIN}"
chmod 600 "/etc/opendkim/keys/${DOMAIN}/${DKIM_SELECTOR}.private"
chmod 644 "/etc/opendkim/keys/${DOMAIN}/${DKIM_SELECTOR}.txt"

for user in "${MAIL_USERS[@]}"; do
  runuser -u "${user}" -- mkdir -p "${MAIL_ROOT}/${user}/Maildir"
  runuser -u "${user}" -- maildirmake.dovecot "${MAIL_ROOT}/${user}/Maildir" || true
done

cat >/etc/aliases <<ALIASES
postmaster: root
root: info
mailer-daemon: postmaster
ALIASES
newaliases

ufw allow 25/tcp || true
ufw allow 587/tcp || true
ufw allow 993/tcp || true

systemctl enable opendkim postfix dovecot
systemctl restart opendkim
systemctl restart postfix
systemctl restart dovecot

echo
echo "DKIM record:"
cat "/etc/opendkim/keys/${DOMAIN}/${DKIM_SELECTOR}.txt"
echo
echo "Credentials saved to /root/redcore-mail-credentials.txt"
echo "Important: add A record ${MAIL_FQDN} -> server IP if your MX points there."
