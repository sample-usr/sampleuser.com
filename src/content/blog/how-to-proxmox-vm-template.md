---
title: "How to: VM templates in Proxmox"
description: "How to create VM templates in Proxmox"
publishedAt: 2024-06-27
tags: ["how-to", "dev"]
---

Proxmox gives you the ability to create templates
which are exactly what they sound like,
blueprints of virtual machines
that can be willed into reality, well soft-reality.
But that's not all, we can use "Cloud-init",
to setup the initial operating system
with a bunch of stuff like the super user,
dhcp, ssh keys or any other packages
we would like to be pre-installed on the virtual machine.
Let's take a look into how we can create these virtual machines,
and configure them with Cloud-init.

> It is important to note a big difference between the BIOS
> of the virtual machine template we'll create.
> Essentially if you would like to pass-through
> any PCIe device like a dGPU from the host to the VM
> then you would need to create a VM with UEFI boot,
> otherwise you can pretty much use the SeaBIOS boot (default in Proxmox)
> in all cases

### Virtual Machine template

To create a virtual machine for use with Cloud-init,
we would need a cloud image, duh.
These are different than your normal desktop/server variants
and optimized to be run in data centres.
You can find these images for pretty much all linux distros,
for instance, `ubuntu` cloud images are available at https://cloud-images.ubuntu.com/,
and that's what we'll be using,
but of course, you can take whatever distro you like.

#### Download the cloud image

Make sure you get the `img` or `qcow2` format.
Get into the Proxmox host shell and download
the image.

```bash
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
```

#### Create the base VM

We'll start setting up our virtual machine
with some basic hardware.

##### For SeaBIOS

```bash
qm create 9000 \
	--name ubuntu-cloud \
	--ostype l26 \
	--net0 virtio,bridge=vmbr0 \
	--socket 1 \
	--core 1 \
	--numa 1 \
	--cpu host \
	--memory 2048
```

##### For UEFI

```bash
qm create 9000 \
	--name ubuntu-cloud \
	--machine q35 \
	--bios ovmf \
	--ostype l26 \
	--net0 virtio,bridge=vmbr0 \
	--socket 1 \
	--core 1 \
	--numa 1 \
	--cpu host \
	--memory 2048
```

This will create a VM with id 9000,
named `ubuntu-cloud`.
You can read more about each individual argument
but here are the important ones:

- **ostype:** It has to be `l26` for linux
- **numa:** Enabling `NUMA` helps with VM performance as the VM's vCPUs are all on the same physical socket (a nice thing for any modern CPU)
- **cpu:** If you have a single node Proxmox, or all your CPUs in the Proxmox clusters are the same, or you don't care about live migration from one node to another node (with different CPU) then keep it as `host` for maximum performance benefit.
- **bios:** This sets up the type of BIOS the VM will be using and `ovmf` is for UEFI.

Enable the guest agent.

```bash
qm set 9000 --agent enabled=1
```

#### Add bootdisk (only UEFI)

UEFI needs a separate bootdisk
than the one provided for the OS,
so we need to add that separately.

```bash
qm set 9000 -efidisk0 local-lvm:0,format=raw,efitype=4m,pre-enrolled-keys=0
```

- **local-lvm:** This is the name of your Proxmox thin storage (change it if it's different)
- **pre-entrolled-keys:** We disable secure boot for the VM as it causes problems with Cloud-init

#### Disk setup

We have to import the cloud image
we downloaded, on to the disk.

```bash
qm importdisk 9000 noble-server-cloudimg-amd64.img local-lvm
```

We attach the new disk on to the VM.
If your disk is not an SSD
then remove the `discard=on` option.

##### For SeaBIOS

```bash
qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0,discard=on
```

##### For UEFI

```bash
qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-1,discard=on
```

Attach a fake CD-Drive.

```bash
qm set 9000 --ide2 local-lvm:cloudinit
```

Make the VM boot from our Cloud-init image.

```bash
qm set 9000 --boot c --bootdisk scsi0
```

Resize the disk to your desired size,
we are doing 30GB here.

```bash
qm disk resize 9000 scsi0 30G
```

### Cloud-Init Setup

First we ought to enable the Snippets feature in Proxmox,
if it isn't already.
Go to `Datacenter` -> `Storage` -> `Edit`
and make sure that `Snippets` is selected.

Next we need to create a `vendor.yaml` file at `var/lib/vz/snippets` folder
with the following contents

```yaml
runcmd:
  - apt update
  - apt install -y qemu-guest-agent
  - systemctl start qemu-guest-agent
  - reboot
```

This would automatically install the guest-agent
the first time our VM boots up.
You can add any other commands here that
you like to run on first boot.

With that, we can configure the VM for Cloud-Init.

```bash
qm set 9000 --cicustom "vendor=local:snippets/vendor.yaml"
qm set 9000 --ciuser cloud
qm set 9000 --cipassword $(openssl passwd -6 very_strong_password)
qm set 9000 --sshkeys ~/.ssh/authorized_keys
qm set 9000 --ipconfig0 "ip=dhcp,ip6=dhcp"
```

- **--cicustom:** Setup the custom snippet to be run on first boot
- **--ciuser:** The root user of our VM (modify)
- **--cipassword:** The root user password (modify)
- **--sshkeys:** The path to public ssh keys we want to add in the VM (these can be multiple in a single folder)
- **--ipconfig0:** Setups the IP4 and IP6 for the VM to use dhcp

And finally, Once you are done, proceed with making the VM a template

```bash
qm template 9000
```

You can now create a new VM
by right clicking on the template and then cloning it.
Make sure you do a Full Clone otherwise
the VM will be linked to the template settings
and changes there might affect the VM.

If the above is too much of a hassle,
here is a little script that does the same:

```bash
#!/bin/bash

# Make sure that you have download the cloud image already and edit
# the CLOUD_IMAGE_PATH below

export VM_ID=9000
export VM_NAME=ubuntu-cloud
export LV_STORAGE=local-lvm
export CLOUD_IMAGE_PATH=noble-server-cloudimg-amd64.img
export VM_SIZE=30G
export CLOUD_INIT_USER=CLOUD_USER
export CLOUD_INIT_USER_PASSWORD=SOME_STRONG_PASSWORD

echo "Creating the VM"
qm create $VM_ID --name $VM_NAME --cpu cputype=host --socket 2 --core 2 --numa 1 --memory 8192 --net0 virtio,bridge=vmbr0 --ostype l26

echo "Importing the cloud image"
qm importdisk $VM_ID $CLOUD_IMAGE_PATH $LV_STORAGE

echo "Attaching the disk"
qm set $VM_ID --scsihw virtio-scsi-pci --scsi0 $LV_STORAGE:vm-$VM_ID-disk-0,discard=on,ssd=1
qm set $VM_ID --ide2 $LV_STORAGE:cloudinit

echo "Creating the bootdisk"
qm set $VM_ID --boot c --bootdisk scsi0

echo "Adding serial vga socket"
qm set $VM_ID --serial0 socket --vga serial0

echo "Enabling qemu agent"
qm set $VM_ID --agent enabled=1

echo "Resizing the disk"
qm disk resize $VM_ID scsi0 $VM_SIZE

echo "Adding additional software packages to cloud-init via snippets"
cat << EOF | sudo tee /var/lib/vz/snippets/vendor.yaml
#cloud-config
runcmd:
    - apt update
    - apt install -y qemu-guest-agent
    - systemctl start qemu-guest-agent
    - reboot
EOF

echo "Adding user information"
qm set $VM_ID --cicustom "vendor=local:snippets/vendor.yaml"
qm set $VM_ID --ciuser $CLOUD_INIT_USER
qm set $VM_ID --cipassword $(openssl passwd -6 $CLOUD_INIT_USER_PASSWORD)
qm set $VM_ID --sshkeys ~/.ssh/authorized_keys
qm set $VM_ID --ipconfig0 "ip=dhcp,ip6=dhcp"

echo "Converting to template"
qm template $VM_ID

echo "Remove all environment variables"
unset $VM_ID
unset $VM_NAME
unset $LV_STORAGE
unset $CLOUD_IMAGE_PATH
unset $VM_SIZE
unset $CLOUD_INIT_USER
unset $CLOUD_INIT_USER_PASSWORD

echo "Finished crearing new template"
```
