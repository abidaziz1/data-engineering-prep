/* Mission 4: Services, names and endpoints. Every call was made from a client pod on a real cluster. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SY = G.file('svc-web.yaml'), SW = G.file('svc-web-wrong.yaml'), SP = G.file('svc-web-port.yaml');
  var EP = G.counts('svc.endpoints'), WS = G.counts('svc.wrong_selector'), WP = G.counts('svc.wrong_port'), IC = G.counts('svc.ip_change');
  G.expect(EP.addresses === 3 && EP.pods === 3, 'the Service has one endpoint address for each of the three pods');
  G.expect(WS.endpoints_empty === true && WS.wget_rc !== 0, 'a selector that matches no pod gives empty endpoints and a failed call');
  G.expect(WP.wget_rc !== 0, 'a wrong targetPort gives a failed call');
  G.expect(IC.old_ip_gone === true && IC.name_still_works === true, 'a replaced pod has a new address and the Service name still works');
  G.expect(G.text('svc.short') === 'web version 1' && G.text('svc.fqdn') === 'web version 1', 'both names reach a pod of version 1');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Services and names', short: 'Services', blurb: 'A stable name and address in front of pods that come and go', minutes: 17,
    focus: ['mart', 'ing'],
    goals: [
      'Explain why pods need a **Service** in front of them.',
      'Read **selector, port, targetPort and endpoints**.',
      'Call a Service by its **DNS name** from another pod.',
      'Find out why a Service **answers nothing**.'
    ],
    say: 'Pod addresses change every time a pod is replaced, so no client can use them. A Service gives a group of pods one name and one address that stay. This mission calls a Service from a client pod, breaks it in two ways, and reads what the cluster says.',
    scenes: [
      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'How a call reaches a pod', g: 'svc', legend: true,
        steps: [
          { say: 'A client pod wants to call "web". It does not know any pod address. Press Next.', focus: ['cli', 'svc', 'p1', 'p2', 'p3'], cap: 'The client knows a name.' },
          { say: 'Step 1. The client asks the **cluster DNS** for the name `web`.', on: ['e1'], focus: ['cli', 'dns'], cap: 'The name goes to DNS.' },
          { say: 'Step 2. DNS answers with the address of the **Service**. This address does not change while the Service exists.', on: ['e2'], focus: ['cli', 'svc'], cap: 'DNS gives the Service address.' },
          { say: 'Step 3. The Service looks at its **endpoints**: the list of pods that match its selector **and are ready**.', on: ['e3'], focus: ['svc', 'eps'], cap: 'The Service reads its endpoints.' },
          { say: 'Step 4. The traffic goes to one of those pods, on the **target port**. Pods that are not ready are not in the list.', on: ['e4', 'e5', 'e6'], focus: ['eps', 'p1', 'p2', 'p3'], tags: ['tg_port'], cap: 'One ready pod gets the call.' },
          { say: 'If no pod matches the selector, or none is ready, the list is empty and the call fails. The Service exists, and nothing answers.', focus: ['svc', 'eps'], tags: ['tg_none'], cap: 'An empty list is a common failure.' }
        ]
      }),

      B.code({
        id: 'm4-yaml', t: 1, src: 'rec', title: 'The Service of the web pods', file: 'svc-web.yaml', lang: 'yaml', code: SY,
        steps: [
          { say: 'Ten lines. I applied this file next to the Deployment from mission 3. Press Next.', lines: null },
          { say: 'The **name** becomes a DNS name. Other pods can call `web`.', lines: G.span(SY, /name: web/) },
          { say: 'The **selector** picks the pods by label. It is the only link between the Service and the pods: a label, not a name.', lines: G.span(SY, /selector:/, /app: web/) },
          { say: '**port** is the port of the Service, the one that callers use. **targetPort** is the port of the pod. Here both are 8080, but they are two settings, and `targetPort` must be the port that the program listens on.', lines: G.span(SY, /ports:/, /targetPort/) }
        ],
        note: 'The type is not written, so it is ClusterIP: an address that works only inside the cluster.'
      }),

      B.term({
        id: 'm4-get', t: 1, src: 'rec', title: 'The Service and its endpoints',
        say: 'I applied it and read the Service and the addresses behind it.',
        lines: function () {
          return G.term([
            ['kubectl apply -f svc-web.yaml', 'service/web created'],
            ['kubectl get svc web', G.text('svc.get')],
            ['kubectl get endpointslices -l kubernetes.io/service-name=web   # the addresses', EP.addresses + ' addresses, for ' + EP.pods + ' pods']
          ]);
        },
        after: 'The Service has a **ClusterIP** and a port. Behind it there are **' + EP.addresses + '** addresses, one for each ready pod. The EXTERNAL-IP is empty, because this type is not reachable from outside the cluster. The address of the Service is masked in the screen, because it changes on every run.',
        afterKind: 'tip',
        doneSay: 'A Service is a stable address with a list of ready pods behind it.'
      }),

      B.term({
        id: 'm4-dns', t: 1, src: 'rec', title: 'Call it by name from another pod',
        say: 'I started a small client pod and called the Service three ways.',
        lines: function () {
          return G.term([
            ['kubectl exec client -- cat /etc/resolv.conf', G.text('svc.resolv')],
            ['kubectl exec client -- getent hosts web   # and again with web.brewline.svc.cluster.local', G.text('svc.getent')],
            ['kubectl exec client -- wget -qO- http://web:8080', G.text('svc.short')],
            ['kubectl exec client -- wget -qO- http://web.brewline.svc.cluster.local:8080', G.text('svc.fqdn')]
          ]);
        },
        after: 'The client pod gets a `search` line in `resolv.conf` that starts with its **own namespace**, so the short name `web` works inside `brewline`. The full name is `web.brewline.svc.cluster.local`: **service, namespace, svc, cluster domain**. Both names give the same address and the same answer. From another namespace you need at least `web.brewline`.',
        afterKind: 'tip',
        doneSay: 'The short name works in the same namespace. The long one works everywhere.'
      }),

      B.widget({ id: 'm4-lab', kind: 'svc', t: 1, src: 'rec', title: 'Lab: three Services, one that works' }),

      B.term({
        id: 'm4-wrong', t: 1, src: 'rec', title: 'A Service with a selector that matches nothing',
        say: 'The same Service with one letter changed in the selector: `app: webb`.',
        lines: function () {
          return G.term([
            ['kubectl apply -f svc-web-wrong.yaml', 'service/web-wrong created'],
            ['kubectl describe svc web-wrong   # the Endpoints line', G.text('svc.wrong_describe')],
            ['kubectl exec client -- wget -qO- -T 3 http://web-wrong:8080', G.text('svc.wrong_wget')]
          ]);
        },
        after: 'The Service was **created without an error**, and has an address, and has **no endpoints**. The call is **refused** (exit code ' + WS.wget_rc + '): for a Service without endpoints, kube-proxy on the node installs a rule that rejects the connection. Kubernetes does not check that a selector matches anything, because pods may come later. So the first thing to read, when a Service does not answer, is the **Endpoints** line.',
        afterKind: 'warn',
        doneSay: 'An empty Endpoints line means: the selector matches no ready pod.'
      }),

      B.term({
        id: 'm4-port', t: 1, src: 'rec', title: 'A Service that forwards to the wrong port',
        say: 'The selector is right now, and `targetPort` is 8000. The pods listen on 8080.',
        lines: function () {
          return G.term([
            ['kubectl apply -f svc-web-port.yaml', 'service/web-port created'],
            ['kubectl get endpointslices -l kubernetes.io/service-name=web-port -o jsonpath="{.items[0].ports[0].port}"', G.text('svc.port_endpoint')],
            ['kubectl exec client -- wget -qO- -T 3 http://web-port:8080', G.text('svc.port_wget')]
          ]);
        },
        after: 'This time the **endpoints exist**: the pods are listed, with port ' + G.text('svc.port_endpoint') + '. The call fails the same way (exit code ' + WP.wget_rc + '), because nothing in the pod listens on that port. Both mistakes end in **Connection refused**, so the call alone does not tell them apart. The **endpoints** do: empty means that no pod was selected, and filled means that pods were selected and the port is wrong. Compare `targetPort` with the port in the container.',
        afterKind: 'warn',
        doneSay: 'Refused with endpoints present: look at targetPort. Refused with none: look at the selector.'
      }),

      B.term({
        id: 'm4-ip', t: 1, src: 'rec', title: 'The pod is replaced, the name stays',
        say: 'I deleted one of the three web pods, and waited until the Deployment had made a new one.',
        lines: function () {
          return G.term([
            ['kubectl delete pod web-<hash>-<id>', 'pod "web-<hash>-<id>" deleted'],
            ['kubectl get pods -l app=web -o wide   # is the old address still in the list?', IC.old_ip_gone ? 'no: the new pod has a new address' : 'yes'],
            ['kubectl exec client -- wget -qO- http://web:8080', IC.name_still_works ? G.text('svc.short') : 'failed']
          ]);
        },
        after: 'The replacement pod got a **new address**, and the Service did not change at all: the name still works and the call still returns an answer. This is the reason for the Service. Never put a pod address in a configuration file. Put the Service name.',
        afterKind: 'tip',
        doneSay: 'Pods change address. The Service name does not.'
      }),

      B.cmp({
        id: 'm4-types', t: 2, src: 'docs', title: 'The types of Service',
        say: 'The `type` decides who can reach the Service. Press Next.',
        cols: ['Type', 'Reachable from', 'Typical use'],
        hl: 0,
        rows: [
          ['`ClusterIP` (the default)', 'Inside the cluster only.', 'One service calling another, like the loader and the database.'],
          ['`Headless` (`clusterIP: None`)', 'Inside the cluster. DNS returns the pod addresses, not one address.', 'A StatefulSet such as Postgres, where each pod has its own name. The `pg` Service of the next missions is headless.'],
          ['`NodePort`', 'Outside, on a port of every node.', 'Quick tests, and the base for the other types.'],
          ['`LoadBalancer`', 'Outside, through a load balancer of the cloud.', 'One public service. Each one costs a load balancer.'],
          ['`Ingress` or Gateway', 'Outside, by host name and path, through one entry.', 'Many web services behind one address.']
        ],
        steps: [
          { upto: 2, say: 'ClusterIP is the default, and most Services of a data platform stay there. The headless variant gives you the pod names, which a database cluster needs.' },
          { upto: 5, say: 'The rest is about the way in from outside. A cloud gives a load balancer for each LoadBalancer Service, so many of them cost money. Ingress shares one entry between many Services. Here all five were not run: the cluster of the recording had no load balancer or ingress controller, so this table is from documentation.' }
        ]
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'This Service has no endpoints and every call fails. The pods are running and ready. Click the line that is the problem.',
        file: 'svc-web-wrong.yaml', lang: 'yaml', code: SW, bad: [G.at(SW, /app: webb/)],
        hint: 'Compare the labels of the pods with the selector of the Service. Is every letter right?',
        why: 'The selector is `app: webb`, and the pods are labelled `app: web`. The Service links to pods only by label, so it matches nothing, and Kubernetes does not warn about it. `kubectl get endpoints` or the Endpoints line of `kubectl describe svc` shows it at once.',
        fix: SY,
        cheer: 'Selector and labels must match exactly.'
      }),

      B.bug({
        id: 'm4-bug2', t: 2, q: 'The endpoints list three pods, and the call is refused. Click the line that is the problem.',
        file: 'svc-web-port.yaml', lang: 'yaml', code: SP, bad: [G.at(SP, /targetPort/)],
        hint: 'Which port does the program in the pod listen on?',
        why: 'The pods listen on 8080 and the Service forwards to `targetPort: 8000`. The endpoints are right, because the selector is right, but nothing listens on the port that is used. A refused connection, with endpoints present, points to the port.',
        fix: SY,
        cheer: 'Selector wrong gives no endpoints. Port wrong gives refused calls.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put in order what happens when a client pod calls `http://web:8080`.',
        items: [
          'The client asks the cluster DNS for the name web',
          'DNS returns the stable address of the Service',
          'The client connects to the Service address',
          'The Service picks one ready pod from its endpoints',
          'The traffic reaches the pod on the target port'
        ],
        why: 'The name gives an address, and the address leads to a list of ready pods, and one of them gets the call. A pod that is not ready is not in the list, so it never gets a call.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'A Service exists, and `kubectl describe svc` shows `Endpoints:` with nothing after it. What is the most likely cause?',
        opts: [
          { t: 'The selector matches no pod that is ready', fb: '' },
          { t: 'The cluster DNS is down', fb: 'DNS has nothing to do with the list of endpoints.' },
          { t: 'The Service has the wrong type', fb: 'The type does not change the list of endpoints.' },
          { t: 'The cluster has too few nodes', fb: 'The list is built from pods and their labels.' }
        ],
        ok: 0, why: 'The recording of `web-wrong` shows exactly this: a selector with a typo, and an Endpoints line with nothing after it.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'The endpoints list the pods, and the call is **refused**. Which setting do you check first?',
        opts: [
          { t: '`targetPort` of the Service against the port of the container', fb: '' },
          { t: 'The labels of the pods', fb: 'The endpoints are filled, so the selector works.' },
          { t: 'The name of the Service', fb: 'The name resolved, or the call would not have been refused.' },
          { t: 'The number of replicas', fb: 'Fewer pods would not refuse a call.' }
        ],
        ok: 0, why: 'In the recording `web-port` forwards to ' + G.text('svc.port_endpoint') + ' and the pods listen on 8080.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'Why should a configuration file hold the **name** of a Service and not the address of a pod?',
        opts: [
          { t: 'A replaced pod gets a new address, and the Service name keeps working', fb: '' },
          { t: 'Pod addresses are secret', fb: 'They are not secret. They change.' },
          { t: 'Pods have no addresses', fb: 'They have one each.' },
          { t: 'Names are faster than addresses', fb: 'Speed is not the reason.' }
        ],
        ok: 0, why: 'In the recording the old address was gone after the replacement (' + IC.old_ip_gone + ') and the name still returned an answer (' + IC.name_still_works + ').'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: how do you expose the services of the platform?',
        scenario: 'The cluster runs three things: a Postgres database that only the loader uses, an internal API that two other teams call from their own namespaces, and a small web page for the store managers that must be reachable from the internet.',
        opts: [
          { t: 'A `LoadBalancer` Service for each of the three', d: 'Everything is reachable, and no further setup is needed.', lose: 'The database is now on the internet, and you pay for three load balancers.' },
          { t: 'ClusterIP for the database and the API, and an Ingress for the web page only', d: 'The database and the API stay inside the cluster. The other teams use `api.brewline`, the name with the namespace. Only the page has a way in.', lose: 'You need an ingress controller, and a certificate for the host name.' },
          { t: '`NodePort` for all three', d: 'No cloud load balancer is needed.', lose: 'Ports in a high range on every node, and no host names or certificates. The database is open again.' }
        ],
        pick: 1,
        why: 'A Service type is a decision about who may call it. The database has one caller and should have no way in from outside. The API is called from other namespaces, which a name with the namespace solves. Only the page needs the internet.',
        when: 'A LoadBalancer for each service is fine for a small test, or when each service really needs its own public address.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: the dashboard cannot reach the API', time: '09:40',
        alert: '**The dashboard shows "connection refused" for the loader API since the 09:15 release.** The API pods are all Running and show 1/1.',
        clues: ['`kubectl describe svc api` shows three endpoints', 'The release changed the container port from 8080 to 8000', 'A call from a test pod to the pod address on port 8000 works'],
        opts: [
          { t: 'Change `targetPort` of the Service to the new container port', fb: '' },
          { t: 'Restart the three API pods', fb: 'The pods are fine, and a restart changes nothing.' },
          { t: 'Delete and recreate the Service', fb: 'The same wrong port would come back.' },
          { t: 'Check the DNS of the cluster', fb: 'The name resolves, or the error would be a different one.' }
        ],
        best: 0,
        why: 'Endpoints are present, so the selector is right. The call is refused, so the port is the suspect. The release moved the container port, and the Service still sends to the old one. In the recording the same picture came from `web-port`: endpoints with port ' + G.text('svc.port_endpoint') + ' and a refused call.',
        checks: [
          ['Read the endpoints', 'Three addresses: the selector is right.'],
          ['Read the error', 'A refusal with endpoints present: the pods are selected and the port is wrong. A time-out would point to a network policy.'],
          ['Compare the ports', '`targetPort` of the Service against `containerPort` of the pod.'],
          ['Prevent', 'Name the port in the pod and use the name in `targetPort`, so that one change is enough.']
        ],
        tell: 'The API stopped answering after a release because the container port changed and the Service still forwarded to the old one. The endpoints were fine, so I looked at the ports, and updated targetPort. To avoid it I now give the port a name in the pod and refer to the name in the Service.',
        prevent: ['Use a **named port** in the pod and in `targetPort`', 'Check **endpoints** after every release', 'Add a **smoke call** through the Service in the pipeline']
      }),

      B.qa({
        id: 'qa-svc', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'Why do you need a Service when you already have a Deployment with pods?',
        pts: ['Pods are replaced, and every new pod has a new address', 'A Service gives a stable name and address', 'It picks the pods by label and only the ready ones', 'It spreads the calls over the pods'],
        short: 'Pods are temporary: when one is replaced it gets a new address, so no client can rely on it. A Service gives the group of pods one stable name and one address. It finds the pods by their labels, lists the ones that are ready as endpoints, and sends each call to one of them. In the recording I deleted a pod of the web Deployment, the new pod had another address, and the call to `http://web:8080` still returned an answer. The Service also keeps a pod that is not ready out of the list, which is what makes a rolling update safe for the users.',
        fu: [['How does a client find the Service?', 'Through the cluster DNS: `web` in the same namespace, `web.brewline` from another one.'], ['Does a Service balance the load?', 'It spreads connections over the ready pods. It does not look at how busy a pod is. From documentation.']],
        trap: 'Putting pod addresses in a configuration, or thinking that a Service runs anything.',
        real: 'Say which service of yours is called by name, and by whom.'
      }),

      B.qa({
        id: 'qa-endpoints', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'A Service does not answer. How do you find out why?',
        pts: ['Read the Endpoints of the Service', 'Empty: the selector or the readiness is wrong', 'Filled and refused: the target port is wrong', 'Test from a pod in the same namespace'],
        short: 'I start with `kubectl describe svc` and read the Endpoints line. If it is empty, the selector matches no ready pod, so I compare the selector with the pod labels, and look at whether the pods are ready. If it lists the pods and the call is refused, the port is wrong, so I compare `targetPort` with the port that the container listens on. I always test from a pod in the same namespace with the Service name, because that is what the real callers do. I recorded both cases: a selector with one letter wrong gave empty endpoints, and a wrong targetPort gave endpoints and a refused call.',
        fu: [['What if the call times out?', 'Often a network policy or a pod that is not ready. A refusal means a pod answered. From documentation.'], ['Where do the endpoints come from?', 'A controller builds them from the pods that match and are ready.']],
        trap: 'Restarting pods before reading the endpoints.',
        real: 'Describe how you fixed a Service that did not answer.'
      }),

      B.qa({
        id: 'qa-dns', t: 2, tag: 'Kubernetes', secs: 60,
        q: 'How does service discovery work inside a cluster?',
        pts: ['Cluster DNS creates a name for each Service', 'The full name is service.namespace.svc.cluster.local', 'The pod search path starts with its own namespace', 'Environment variables exist too, but DNS is the way'],
        short: 'The cluster runs a DNS service, and every Service gets a name in it: `service.namespace.svc.cluster.local`. Each pod is configured with a search path that starts with its own namespace, so `web` works inside the same namespace and `web.brewline` works from another one. I recorded both names from a client pod, and both gave the same answer. The address behind the name is the ClusterIP of the Service, which stays while the Service exists. A headless Service has no ClusterIP, and DNS returns the pod addresses, which is how a StatefulSet gives each pod a name.',
        fu: [['What is the name of a pod of a StatefulSet?', '`pg-0.pg.brewline.svc.cluster.local` for a pod pg-0 and a headless Service pg. From documentation.'], ['Who runs the DNS?', 'CoreDNS, as pods in the kube-system namespace.']],
        trap: 'Using the short name from another namespace.',
        real: 'Say how two of your services find each other.'
      }),

      B.qa({
        id: 'qa-kubeproxy', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'A ClusterIP is not the address of any machine. How does a call to it reach a pod?',
        pts: ['kube-proxy on every node watches Services and endpoints', 'It writes rules (iptables, IPVS or nftables) that rewrite the Service address to a pod address', 'The choice of pod happens in those rules, per connection', 'A Service with no endpoints gets a rule that rejects the connection'],
        short: 'The address of a ClusterIP exists only in rules. kube-proxy runs on every node, watches the Services and their endpoints, and writes packet rules, in iptables, IPVS or nftables, that rewrite a call to the Service address into a call to one of the pod addresses. The pod is picked in those rules, per connection, so nothing listens on the Service address and no process sits in the middle. When a Service has no endpoints, the rules reject the connection, which is why the recorded call to a Service whose selector matched nothing ended in Connection refused, the same words as a wrong target port. Some network plugins replace kube-proxy with their own rules.',
        fu: [['Does a Service balance by load?', 'No. It spreads connections over the ready pods, without looking at how busy they are.'], ['What is a headless Service?', 'One with no ClusterIP. DNS returns the pod addresses, which a StatefulSet needs.']],
        trap: 'Thinking that a Service is a proxy process that you can restart.',
        real: 'Say which network plugin your cluster uses.'
      }),

      B.qa({
        id: 'qa-ingress', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'How do you expose several web services of a platform to the internet?',
        pts: ['A LoadBalancer Service for each is simple and costs a load balancer each', 'An Ingress, or a Gateway, shares one entry and routes by host and path', 'An ingress controller must be running: the object alone does nothing', 'TLS certificates belong at the entry, often issued automatically'],
        short: 'A Service of type LoadBalancer gives one service its own load balancer of the cloud, which is simple and costs one for each service. For several web services I use an Ingress, or the newer Gateway API, that shares one entry and routes by host name and path to Services inside the cluster. The object does nothing alone: a controller, such as the NGINX ingress controller or the one of the cloud, has to run and read it. TLS ends at that entry, with certificates that a tool such as cert-manager can issue and renew. Databases and internal APIs stay on ClusterIP. No ingress controller ran on the cluster of the recording, so this answer is from documentation.',
        fu: [['What is the Gateway API?', 'A newer, more expressive set of objects for the same job, with roles for the platform team and the app teams. From documentation.'], ['Where does authentication go?', 'At the entry, or in the service. A shared decision with the security team.']],
        trap: 'Creating an Ingress and expecting it to work without a controller.',
        real: 'Say how traffic from outside reaches a service of yours.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Service Mapper', color: '#BBF7D0',
        pts: [
          'A **Service** is a stable name and address. Its **selector** picks pods by label, and the ready ones form the **endpoints**.',
          'Inside the cluster call `http://web:8080`, or `web.brewline` from another namespace.',
          'No endpoints: the **selector** or the readiness. Endpoints and a refusal: the **targetPort**.',
          'A replaced pod has a **new address**, and the Service name still works.',
          'Keep databases on **ClusterIP**. Only what must be public gets a way in.'
        ],
        lines: [
          'I call services by name, never by pod address.',
          'I read the Endpoints line first.',
          'I choose the Service type by who may call it.'
        ]
      })
    ]
  });
})();
