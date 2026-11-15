/* Mission 0: pick a path, see the whole picture, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M = function (k) { return G.meta(k); };

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'What happens after kubectl apply', g: 'master', legend: true,
        steps: [
          { say: 'Brewline\'s loader is a container. Kubernetes runs containers on a group of machines, and keeps them running the way you described. This picture is the whole course. Press Next.', focus: ['you', 'pod'], cap: 'A file on the left, running containers on the right.' },
          { say: 'Step 1. You write a **manifest**, a YAML file that says what you want, and send it with `kubectl apply`. kubectl only talks to the **API server**.', on: ['e1'], focus: ['you', 'api'], cap: 'kubectl sends a description.' },
          { say: 'Step 2. The API server checks the manifest and stores it in **etcd**. From now on the cluster knows what you want. It has not done anything yet.', on: ['e2'], focus: ['api', 'etcd'], tags: ['tg_state'], cap: 'The wish is stored.' },
          { say: 'Step 3. **Controllers** watch the API. A Deployment controller sees a Deployment with no pods, and creates a ReplicaSet and pods as objects in the API.', on: ['e3'], focus: ['ctrl', 'api'], tags: ['tg_loop'], cap: 'Controllers turn a wish into more objects.' },
          { say: 'Step 4. A pod with no node is found by the **scheduler**, which picks a node that has room and writes its name into the pod.', on: ['e4'], focus: ['api', 'sch'], cap: 'The scheduler chooses a node.' },
          { say: 'Step 5. The **kubelet** on that node sees a pod that is assigned to it. It asks the container runtime to pull the image and start the containers.', on: ['e5'], focus: ['sch', 'kub'], tags: ['tg_node'], cap: 'The kubelet starts the containers.' },
          { say: 'Step 6. The pod runs, and the kubelet writes its status back into the API. That is what `kubectl get pod` shows you. If something stops, a controller notices the difference from your wish and corrects it.', on: ['e6'], focus: ['kub', 'pod'], cap: 'Status goes back into the API.' },
          { say: 'That is the course: pods (mission 1), pods that fail (2), Deployments (3), Services (4), configuration (5), storage and a database (6), Jobs (7), resources, probes and shutdown (8), and access (9).', focus: ['you', 'api', 'etcd', 'ctrl', 'sch', 'kub', 'pod'], cap: 'Nine short missions and a boss round.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'A data engineer is not hired to run a cluster. You are asked about Kubernetes because your jobs will run on one, and a platform team will ask you for the numbers. Press Next to read what is expected at each level.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Pods', 'Read a manifest, apply it, and read `get`, `describe` and `logs`.', 'Explain what the control plane does with a manifest, and debug a pod that does not start.'],
          ['Deployments', 'Scale a Deployment and roll out a new image.', 'Set the rollout so that capacity never drops, and roll back a bad release.'],
          ['Services', 'Know that a Service gives pods a stable name.', 'Find a Service with no endpoints, and a wrong port, from the symptoms.'],
          ['Configuration', 'Put settings in a ConfigMap and passwords in a Secret.', 'Know what a Secret does and does not protect, and what a change to a ConfigMap does to a running pod.'],
          ['Storage', 'Know that a pod\'s files disappear, and a claim keeps them.', 'Run a database on a volume claim, and say what each delete does to the data.'],
          ['Jobs', 'Run the loader as a Job and read its log.', 'Choose backoff, parallelism, deadline and cleanup, and schedule it with a CronJob.'],
          ['Limits and access', 'Set a memory limit and read OOMKilled.', 'Size requests and limits, use probes, make a job stop cleanly, and check who may do what.']
        ],
        steps: [
          { upto: 4, say: 'The first four rows are about starting and exposing a workload. A junior applies and reads. A senior understands why a rollout stalls or a Service is empty.' },
          { upto: 7, say: 'The last three are about data, jobs and safety. They carry most of the questions of a senior interview.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data or a request moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it on a cluster and wrote down what Kubernetes did. A **From documentation** tag means that I read it and did not run it.', 'Recorded means run. From documentation means read.'],
          ['What ran', 'A real Kubernetes cluster with one node, started in a container for this course, the Brewline loader job, and a real Postgres. Every `kubectl` output is real. Names with a random suffix and ages are masked, because they change on every run.', 'Every kubectl output is real.'],
          ['What I changed to make it run here', 'The sandbox that built the course has an older cgroup setup, a small disk and a proxy. The recorder told the kubelet and containerd about that. Nothing else differs from a plain k3s cluster, and the README lists each setting.', 'The README lists every change.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['The cluster', 'Kubernetes ' + M('kubernetes') + ' as the distribution k3s (' + M('k3s_image') + '), one node that runs the control plane and the workloads, container runtime ' + M('runtime') + ', kernel ' + M('kernel') + ', ' + M('arch'), 'Run'],
          ['kubectl', 'Version ' + M('kubectl') + ', run inside the cluster container', 'Run'],
          ['The images', 'alpine:3.22, python:3.13-slim, postgres:16-alpine and the loader of the Docker course, copied into the cluster so that it pulled nothing', 'Run'],
          ['The job', 'load_orders.py with 5,000 made-up orders, and a Postgres in a StatefulSet', 'Run'],
          ['Managed clusters', 'Amazon EKS, Google GKE and Azure AKS', 'Not run'],
          ['Helm, operators, Ingress, autoscaling, network policies, several nodes', 'Mentioned where they matter, from documentation', 'Not run']
        ],
        steps: [
          { upto: 4, say: 'The first four rows ran. They are everything you need to see how pods, Deployments, Services, volumes, Jobs and access rules behave.' },
          { upto: 6, say: 'The last two did not run. What I say about them comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
