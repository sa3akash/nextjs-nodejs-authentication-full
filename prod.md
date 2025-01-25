To deploy a MERN stack application to a **VPS** server using **GitHub Actions**, **ArgoCD**, and **Kubernetes**, we need to:

1. **Set up the VPS for Kubernetes** (install Kubernetes and ArgoCD).
2. **Deploy the MERN stack on Kubernetes** using ArgoCD.
3. **Automate CI/CD with GitHub Actions** for building and deploying the application.
4. **Use Let's Encrypt for HTTPS** on the VPS for your domain.

Here’s the complete setup:

---

## **1. VPS Setup for Kubernetes and ArgoCD**

### **Step 1. Install Kubernetes on VPS**
Run these commands on your VPS:

1. Install Docker and Kubernetes tools:
   ```bash
   sudo apt update
   sudo apt install -y docker.io curl apt-transport-https
   curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
   echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
   sudo apt update
   sudo apt install -y kubelet kubeadm kubectl
   sudo systemctl enable docker
   ```

2. Initialize Kubernetes cluster:
   ```bash
   sudo kubeadm init --pod-network-cidr=192.168.0.0/16
   mkdir -p $HOME/.kube
   sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
   sudo chown $(id -u):$(id -g) $HOME/.kube/config
   ```

3. Install a CNI (e.g., Calico):
   ```bash
   kubectl apply -f https://docs.projectcalico.org/v3.25/manifests/calico.yaml
   ```

4. Join additional worker nodes (if any):
   Use the `kubeadm join` command printed during `kubeadm init`.

---

### **Step 2. Install ArgoCD**
1. Install ArgoCD:
   ```bash
   kubectl create namespace argocd
   kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
   ```

2. Expose ArgoCD server using `NodePort`:
   ```bash
   kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort", "ports": [{"port": 80, "targetPort": 8080, "nodePort": 30080}]}}'
   ```

3. Get ArgoCD admin password:
   ```bash
   kubectl get pods -n argocd
   kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
   ```

4. Access ArgoCD:
   Visit `http://<VPS_IP>:30080` and log in with `admin` and the password retrieved above.

---

### **Step 3. Install Ingress Controller**
1. Install Nginx Ingress:
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
   ```

2. Verify the installation:
   ```bash
   kubectl get pods -n ingress-nginx
   ```

---

## **2. Deploy MERN Stack Using ArgoCD**

### **Step 1. Create Kubernetes Manifests for MERN**

1. **Backend Deployment (`backend-deployment.yaml`)**:
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: backend
     namespace: default
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: backend
     template:
       metadata:
         labels:
           app: backend
       spec:
         containers:
         - name: backend
           image: your-dockerhub-user/backend:latest
           ports:
           - containerPort: 5000
           env:
           - name: MONGO_URI
             value: "mongodb://mongo:27017/mydatabase"
   ```

2. **Frontend Deployment (`frontend-deployment.yaml`)**:
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: frontend
     namespace: default
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: frontend
     template:
       metadata:
         labels:
           app: frontend
       spec:
         containers:
         - name: frontend
           image: your-dockerhub-user/frontend:latest
           ports:
           - containerPort: 3000
   ```

3. **MongoDB Deployment (`mongo-deployment.yaml`)**:
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: mongo
     namespace: default
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: mongo
     template:
       metadata:
         labels:
           app: mongo
       spec:
         containers:
         - name: mongo
           image: mongo:latest
           ports:
           - containerPort: 27017
           volumeMounts:
           - name: mongo-data
             mountPath: /data/db
         volumes:
         - name: mongo-data
           persistentVolumeClaim:
             claimName: mongo-pvc
   ```

4. **MongoDB PVC (`mongo-pvc.yaml`)**:
   ```yaml
   apiVersion: v1
   kind: PersistentVolumeClaim
   metadata:
     name: mongo-pvc
     namespace: default
   spec:
     accessModes:
     - ReadWriteOnce
     resources:
       requests:
         storage: 5Gi
   ```

5. **Ingress for MERN (`mern-ingress.yaml`)**:
   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: mern-ingress
     namespace: default
     annotations:
       kubernetes.io/ingress.class: "nginx"
   spec:
     rules:
     - host: sa3akash.com
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: frontend
               port:
                 number: 3000
         - path: /api
           pathType: Prefix
           backend:
             service:
               name: backend
               port:
                 number: 5000
   ```

---

### **Step 2. Use ArgoCD for Deployment**

1. Create an ArgoCD Application for MERN:
   ```yaml
   apiVersion: argoproj.io/v1alpha1
   kind: Application
   metadata:
     name: mern-stack
     namespace: argocd
   spec:
     destination:
       namespace: default
       server: https://kubernetes.default.svc
     source:
       repoURL: https://github.com/your-repo/mern-stack-k8s
       path: manifests
       targetRevision: main
     project: default
   ```

2. Apply the ArgoCD Application:
   ```bash
   kubectl apply -f argo-application.yaml
   ```

---

## **3. Automate Deployment with GitHub Actions**

1. **GitHub Actions Workflow (`mern-ci-cd.yml`)**:
   ```yaml
   name: MERN CI/CD

   on:
     push:
       branches:
         - main

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
       - name: Checkout code
         uses: actions/checkout@v3

       - name: Set up Docker
         uses: docker/setup-buildx-action@v2

       - name: Login to DockerHub
         run: echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin

       - name: Build and push backend
         run: |
           docker build -t your-dockerhub-user/backend:latest ./backend
           docker push your-dockerhub-user/backend:latest

       - name: Build and push frontend
         run: |
           docker build -t your-dockerhub-user/frontend:latest ./frontend
           docker push your-dockerhub-user/frontend:latest

       - name: Sync ArgoCD
         run: kubectl apply -f argo-application.yaml
         env:
           KUBECONFIG: ${{ secrets.KUBECONFIG }}
   ```

---

## **4. Enable HTTPS with Let's Encrypt**

1. Add TLS to the Ingress:
   Update `mern-ingress.yaml` with TLS configuration:
   ```yaml
   tls:
   - hosts:
     - sa3akash.com
     secretName: sa3akash-tls
   ```

2. Use Certbot to Get Certificates:
   ```bash
   certbot certonly --standalone -d sa3akash.com
   ```

3. Add the Certificate as a Secret:
   ```bash
   kubectl create secret tls sa3akash-tls --cert=/etc/letsencrypt/live/sa3akash.com/fullchain.pem --key=/etc/letsencrypt/live/sa3akash.com/privkey.pem
   ```

---

This setup ensures a production-grade deployment for your MERN stack on a VPS with CI/CD, ArgoCD, and HTTPS using Kubernetes. Let me know if you'd like additional optimizations!





---


Here’s the complete setup for a **local Kubernetes cluster using KIND** with **1 master node** and **4 worker nodes**, and configuration for **auto-scaling** and **auto-healing** using Horizontal Pod Autoscaler (HPA) and Kubernetes native features. This setup will also include a **load balancer** using MetalLB for local environments.

---

### Step 1: Create KIND Cluster Configuration File
Define a custom KIND configuration to specify the cluster topology with 1 master node and 4 worker nodes.

```yaml
# kind-cluster-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
  - role: worker
  - role: worker
networking:
  disableDefaultCNI: false
  podSubnet: "10.244.0.0/16" # Flannel default
  serviceSubnet: "10.96.0.0/12"
```

---

### Step 2: Create the KIND Cluster

Run the following command to create the cluster:

```bash
kind create cluster --config kind-cluster-config.yaml --name mern-cluster
```

---

### Step 3: Install Network Plugin (Flannel)

Install Flannel as the CNI (Container Network Interface) to enable pod-to-pod communication:

```bash
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
```

---

### Step 4: Set Up MetalLB (Load Balancer for Local)

Install MetalLB, a load balancer solution for bare-metal Kubernetes clusters.

1. **Install MetalLB:**

   ```bash
   kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.10/config/manifests/metallb-native.yaml
   ```

2. **Configure MetalLB with a pool of IP addresses:**

   Create a ConfigMap for MetalLB to allocate IP addresses in your local network range.

   ```yaml
   # metallb-config.yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     namespace: metallb-system
     name: config
   data:
     config: |
       address-pools:
       - name: default
         protocol: layer2
         addresses:
         - 192.168.1.240-192.168.1.250
   ```

   Apply the configuration:

   ```bash
   kubectl apply -f metallb-config.yaml
   ```

---

### Step 5: Deploy Metrics Server (For Autoscaling)

Install the Metrics Server to enable HPA (Horizontal Pod Autoscaler):

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Edit the Metrics Server deployment to allow insecure TLS (for local environments):

```bash
kubectl edit deployment metrics-server -n kube-system
```

Add the following arguments under the `spec.containers.args` section:

```yaml
- --kubelet-insecure-tls
- --kubelet-preferred-address-types=InternalIP
```

Restart the Metrics Server:

```bash
kubectl rollout restart deployment metrics-server -n kube-system
```

---

### Step 6: Deploy the MERN Stack

1. **MongoDB Deployment:**

   Create a `mongo-deployment.yaml` file:

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: mongo
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: mongo
     template:
       metadata:
         labels:
           app: mongo
       spec:
         containers:
         - name: mongo
           image: mongo:5.0
           ports:
           - containerPort: 27017
           volumeMounts:
           - name: mongo-data
             mountPath: /data/db
         volumes:
         - name: mongo-data
           emptyDir: {}
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: mongo
   spec:
     ports:
     - port: 27017
       targetPort: 27017
     selector:
       app: mongo
   ```

   Apply the MongoDB deployment:

   ```bash
   kubectl apply -f mongo-deployment.yaml
   ```

2. **Backend Deployment (Node.js):**

   Create a `backend-deployment.yaml` file:

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: backend
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: backend
     template:
       metadata:
         labels:
           app: backend
       spec:
         containers:
         - name: backend
           image: your-backend-image:latest
           ports:
           - containerPort: 5000
           env:
           - name: MONGO_URI
             value: mongodb://mongo:27017/mern
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: backend
   spec:
     ports:
     - port: 5000
       targetPort: 5000
     selector:
       app: backend
   ```

   Apply the Backend deployment:

   ```bash
   kubectl apply -f backend-deployment.yaml
   ```

3. **Frontend Deployment (React):**

   Create a `frontend-deployment.yaml` file:

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: frontend
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: frontend
     template:
       metadata:
         labels:
           app: frontend
       spec:
         containers:
         - name: frontend
           image: your-frontend-image:latest
           ports:
           - containerPort: 3000
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: frontend
   spec:
     ports:
     - port: 80
       targetPort: 3000
     selector:
       app: frontend
   ```

   Apply the Frontend deployment:

   ```bash
   kubectl apply -f frontend-deployment.yaml
   ```

---

### Step 7: Configure HPA for Backend

Create an HPA configuration for the Backend service:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
```

Apply the HPA:

```bash
kubectl apply -f backend-hpa.yaml
```

---

### Step 8: Enable Ingress for Local DNS and HTTPS with Let's Encrypt

1. **Install Cert-Manager:**

   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

2. **Create an Issuer:**

   ```yaml
   # issuer.yaml
   apiVersion: cert-manager.io/v1
   kind: ClusterIssuer
   metadata:
     name: letsencrypt
   spec:
     acme:
       server: https://acme-v02.api.letsencrypt.org/directory
       email: your-email@example.com
       privateKeySecretRef:
         name: letsencrypt-key
       solvers:
       - http01:
           ingress:
             class: nginx
   ```

   Apply the Issuer:

   ```bash
   kubectl apply -f issuer.yaml
   ```

3. **Create Ingress for Your App:**

   ```yaml
   # ingress.yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: mern-ingress
     annotations:
       cert-manager.io/cluster-issuer: "letsencrypt"
   spec:
     tls:
     - hosts:
       - sa3akash.com
       secretName: sa3akash-com-tls
     rules:
     - host: sa3akash.com
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: frontend
               port:
                 number: 80
   ```

   Apply the Ingress:

   ```bash
   kubectl apply -f ingress.yaml
   ```

---

### Step 9: Test Your Cluster

Access the services locally using `sa3akash.com`. Verify HTTPS is working with Let's Encrypt. Test auto-scaling by applying a load to the backend service.

--- 

This setup ensures advanced local configurations with KIND, HTTPS, and auto-scaling features.



---


