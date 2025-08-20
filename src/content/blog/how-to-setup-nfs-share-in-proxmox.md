---
title: "How To: Set Up an NFS Share In Proxmox"
description: "How to setup a simple NFS share using the Proxmox host"
publishedAt: 2025-08-20
tags: ["how-to", "dev", "self-hosting"]
---
If you have the resources,
the best way to set up an NFS share
is to use a separate VM with a dedicated OS
like TrueNAS or OpenMediaVault.

However, if you want something light and simple,
and you don't have a lot of attached network storage,
you can use the Proxmox host itself for providing the NFS share.

The process is quite simple and works well if all you have
is a single node and a bunch of HDDs or SSDs attached to it.

Install the NFS server package on the Proxmox host
```
apt install nfs-kernel-server
```

Then edit the file `/etc/exports` and add a line at the end
for the nfs share, specifying the directory you want to share.
For instance, let's say we have a folder `/mnt/nfs-share`
on the Proxmox host that we would like to share.
We would then add the following line at the end:
```
/mnt/nfs-share 192.168.178.0/24(rw,sync,no_subtree_check)
```
The IP range above means that this entire range has access to the folder.

- `rw`: gives read and write permissions
- `sync`: ensures the NFS server synchronizes file changes and responds to modifications
- `no_subtree_check`: skip checking for subtree in folders which improves reliability and performance

We also need to make sure that the `/mnt/nfs-share` directory has `777` as permissions
```
chmod 777 /mnt/nfs-share
```

Then at the client VM or LXC execute the command
```
mount -t nfs PROXMOX_HOST:/mnt/nfs-share /mnt/NEW_LOCATION_AT_CLIENT
```

> You can also use something like 9pfs and virtioFS to directly populate the host folder
> into a VM but that is a bit tricky.
