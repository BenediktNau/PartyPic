# =============================================================================
# GRAFANA - Visualization & Dashboards
# =============================================================================
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: grafana
  namespace: kube-system
spec:
  repo: https://grafana.github.io/helm-charts
  chart: grafana
  version: "${grafana_version}"
  targetNamespace: ${monitoring_namespace}
  createNamespace: true
  valuesContent: |-
    adminUser: admin
    adminPassword: "${grafana_admin_password}"

    # === PERFORMANCE OPTIMIERUNGEN ===
    # Schnellere Startup-Erkennung
    readinessProbe:
      httpGet:
        path: /api/health
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      
    livenessProbe:
      httpGet:
        path: /api/health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 3
      
    # Datasources
    datasources:
      datasources.yaml:
        apiVersion: 1
        datasources:
          - name: Prometheus
            type: prometheus
            url: http://prometheus-stack-kube-prom-prometheus.${monitoring_namespace}.svc.cluster.local:9090
            access: proxy
            isDefault: true
          - name: Loki
            type: loki
            uid: loki
            url: http://loki-stack.${monitoring_namespace}.svc.cluster.local:3100
            access: proxy

    # Dashboard Provider
    dashboardProviders:
      dashboardproviders.yaml:
        apiVersion: 1
        providers:
          - name: 'partypic'
            folder: 'PartyPic'
            type: file
            disableDeletion: false
            options:
              path: /var/lib/grafana/dashboards/partypic

    # ==========================================================================
    # DASHBOARDS
    # ==========================================================================
    dashboards:
      partypic:
        # ======================================================================
        # 1. APPLICATION METRICS
        # ======================================================================
        application-metrics:
          json: |
            {
              "annotations": {
                "list": [
                  {
                    "builtIn": 1,
                    "datasource": {
                      "type": "grafana",
                      "uid": "-- Grafana --"
                    },
                    "enable": true,
                    "hide": true,
                    "iconColor": "rgba(0, 211, 255, 1)",
                    "name": "Annotations & Alerts",
                    "type": "dashboard"
                  }
                ]
              },
              "editable": true,
              "fiscalYearStartMonth": 0,
              "graphTooltip": 0,
              "id": 2,
              "links": [],
              "panels": [
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "palette-classic"
                      },
                      "custom": {
                        "axisBorderShow": false,
                        "axisCenteredZero": false,
                        "axisColorMode": "text",
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "barWidthFactor": 0.6,
                        "drawStyle": "line",
                        "fillOpacity": 0,
                        "gradientMode": "none",
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        },
                        "insertNulls": false,
                        "lineInterpolation": "linear",
                        "lineWidth": 1,
                        "pointSize": 5,
                        "scaleDistribution": {
                          "type": "linear"
                        },
                        "showPoints": "auto",
                        "showValues": false,
                        "spanNulls": false,
                        "stacking": {
                          "group": "A",
                          "mode": "none"
                        },
                        "thresholdsStyle": {
                          "mode": "off"
                        }
                      },
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          },
                          {
                            "color": "red",
                            "value": 80
                          }
                        ]
                      },
                      "unit": "reqps"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 12,
                    "x": 0,
                    "y": 0
                  },
                  "id": 1,
                  "options": {
                    "legend": {
                      "calcs": [],
                      "displayMode": "list",
                      "placement": "bottom",
                      "showLegend": true
                    },
                    "tooltip": {
                      "hideZeros": false,
                      "mode": "single",
                      "sort": "none"
                    }
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "sum(rate(partypic_http_requests_total[5m])) or sum(rate(nginx_ingress_controller_requests[5m])) or vector(0)",
                      "legendFormat": "Total Requests",
                      "refId": "A"
                    }
                  ],
                  "title": "Request Rate (req/s)",
                  "type": "timeseries"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "palette-classic"
                      },
                      "custom": {
                        "axisBorderShow": false,
                        "axisCenteredZero": false,
                        "axisColorMode": "text",
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "barWidthFactor": 0.6,
                        "drawStyle": "line",
                        "fillOpacity": 0,
                        "gradientMode": "none",
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        },
                        "insertNulls": false,
                        "lineInterpolation": "linear",
                        "lineWidth": 1,
                        "pointSize": 5,
                        "scaleDistribution": {
                          "type": "linear"
                        },
                        "showPoints": "auto",
                        "showValues": false,
                        "spanNulls": false,
                        "stacking": {
                          "group": "A",
                          "mode": "none"
                        },
                        "thresholdsStyle": {
                          "mode": "off"
                        }
                      },
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          },
                          {
                            "color": "red",
                            "value": 80
                          }
                        ]
                      },
                      "unit": "s"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 12,
                    "x": 12,
                    "y": 0
                  },
                  "id": 2,
                  "options": {
                    "legend": {
                      "calcs": [],
                      "displayMode": "list",
                      "placement": "bottom",
                      "showLegend": true
                    },
                    "tooltip": {
                      "hideZeros": false,
                      "mode": "single",
                      "sort": "none"
                    }
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "histogram_quantile(0.95, sum(rate(partypic_http_request_duration_seconds_bucket[5m])) by (le)) or histogram_quantile(0.95, sum(rate(nginx_ingress_controller_request_duration_seconds_bucket[5m])) by (le)) or vector(0)",
                      "legendFormat": "p95 Latency",
                      "refId": "A"
                    }
                  ],
                  "title": "Response Time (p95)",
                  "type": "timeseries"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "mappings": [],
                      "max": 100,
                      "min": 0,
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          },
                          {
                            "color": "yellow",
                            "value": 1
                          },
                          {
                            "color": "red",
                            "value": 5
                          }
                        ]
                      },
                      "unit": "percent"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 6,
                    "x": 0,
                    "y": 8
                  },
                  "id": 3,
                  "options": {
                    "minVizHeight": 75,
                    "minVizWidth": 75,
                    "orientation": "auto",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showThresholdLabels": false,
                    "showThresholdMarkers": true,
                    "sizing": "auto"
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "(sum(rate(partypic_http_requests_total{status=~\"4..|5..\"}[5m])) / sum(rate(partypic_http_requests_total[5m])) * 100) or (sum(rate(nginx_ingress_controller_requests{status=~\"4..|5..\"}[5m])) / sum(rate(nginx_ingress_controller_requests[5m])) * 100) or vector(0)",
                      "refId": "A"
                    }
                  ],
                  "title": "Error Rate (%) 5 Min",
                  "type": "gauge"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "palette-classic"
                      },
                      "custom": {
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        }
                      },
                      "mappings": []
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 6,
                    "x": 6,
                    "y": 8
                  },
                  "id": 4,
                  "options": {
                    "legend": {
                      "displayMode": "list",
                      "placement": "bottom",
                      "showLegend": true
                    },
                    "pieType": "pie",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "sort": "desc",
                    "tooltip": {
                      "hideZeros": false,
                      "mode": "single",
                      "sort": "none"
                    }
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "sum by (status) (increase(nginx_ingress_controller_requests[1h])) or sum by (status) (increase(partypic_http_requests_total[1h]))",
                      "legendFormat": "{{status}}",
                      "refId": "A"
                    }
                  ],
                  "title": "HTTP Status Codes",
                  "type": "piechart"
                },
                {
                  "datasource": {
                    "type": "prometheus",
                    "uid": "PBFA97CFB590B2093"
                  },
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Sessions",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "blue",
                            "value": 0
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 6,
                    "x": 12,
                    "y": 8
                  },
                  "id": 5,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "editorMode": "code",
                      "expr": "max(partypic_active_sessions) or vector(0)",
                      "range": true,
                      "refId": "A"
                    }
                  ],
                  "title": "Active Sessions (PartyPic)",
                  "type": "stat"
                },
                {
                  "datasource": {
                    "type": "prometheus",
                    "uid": "PBFA97CFB590B2093"
                  },
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Users",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 6,
                    "x": 18,
                    "y": 8
                  },
                  "id": 6,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "editorMode": "code",
                      "expr": "max(partypic_users_online) or vector(0)",
                      "range": true,
                      "refId": "A"
                    }
                  ],
                  "title": "Users Online (PartyPic)",
                  "type": "stat"
                },
                {
                  "datasource": {
                    "type": "prometheus",
                    "uid": "PBFA97CFB590B2093"
                  },
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Total Photos",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "purple",
                            "value": 0
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 6,
                    "x": 12,
                    "y": 12
                  },
                  "id": 7,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "editorMode": "code",
                      "expr": "max(partypic_photos_uploaded_total) or vector(0)",
                      "range": true,
                      "refId": "A"
                    }
                  ],
                  "title": "Photos Uploaded (PartyPic)",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "palette-classic"
                      },
                      "custom": {
                        "axisCenteredZero": false,
                        "axisColorMode": "text",
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "drawStyle": "line",
                        "fillOpacity": 20,
                        "gradientMode": "opacity",
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        },
                        "lineInterpolation": "smooth",
                        "lineWidth": 2,
                        "pointSize": 5,
                        "scaleDistribution": {
                          "type": "linear"
                        },
                        "showPoints": "never",
                        "spanNulls": true,
                        "stacking": {
                          "group": "A",
                          "mode": "none"
                        },
                        "thresholdsStyle": {
                          "mode": "off"
                        }
                      },
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": null
                          }
                        ]
                      },
                      "unit": "s"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 6,
                    "x": 18,
                    "y": 12
                  },
                  "id": 8,
                  "options": {
                    "legend": {
                      "calcs": [],
                      "displayMode": "list",
                      "placement": "bottom",
                      "showLegend": true
                    },
                    "tooltip": {
                      "mode": "multi",
                      "sort": "desc"
                    }
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "histogram_quantile(0.50, sum(rate(partypic_http_request_duration_seconds_bucket[5m])) by (le))",
                      "legendFormat": "p50",
                      "refId": "A"
                    },
                    {
                      "expr": "histogram_quantile(0.95, sum(rate(partypic_http_request_duration_seconds_bucket[5m])) by (le))",
                      "legendFormat": "p95",
                      "refId": "B"
                    },
                    {
                      "expr": "histogram_quantile(0.99, sum(rate(partypic_http_request_duration_seconds_bucket[5m])) by (le))",
                      "legendFormat": "p99",
                      "refId": "C"
                    }
                  ],
                  "title": "Request Duration Distribution",
                  "type": "timeseries"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Server Pods",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          },
                          {
                            "color": "yellow",
                            "value": 5
                          },
                          {
                            "color": "orange",
                            "value": 8
                          },
                          {
                            "color": "red",
                            "value": 10
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 6,
                    "x": 0,
                    "y": 16
                  },
                  "id": 9,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "editorMode": "code",
                      "expr": "sum(kube_deployment_status_replicas{deployment=\"party-pic-server\"}) or vector(0)",
                      "range": true,
                      "refId": "A"
                    }
                  ],
                  "title": "Server Pods (HPA)",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Client Pods",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          },
                          {
                            "color": "yellow",
                            "value": 5
                          },
                          {
                            "color": "orange",
                            "value": 8
                          },
                          {
                            "color": "red",
                            "value": 10
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 6,
                    "x": 6,
                    "y": 16
                  },
                  "id": 10,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "editorMode": "code",
                      "expr": "sum(kube_deployment_status_replicas{deployment=\"party-pic-client\"}) or vector(0)",
                      "range": true,
                      "refId": "A"
                    }
                  ],
                  "title": "Client Pods (HPA)",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "palette-classic"
                      },
                      "custom": {
                        "axisCenteredZero": false,
                        "axisColorMode": "text",
                        "axisLabel": "Pods",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "drawStyle": "line",
                        "fillOpacity": 20,
                        "gradientMode": "opacity",
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        },
                        "lineInterpolation": "smooth",
                        "lineWidth": 2,
                        "pointSize": 5,
                        "scaleDistribution": {
                          "type": "linear"
                        },
                        "showPoints": "never",
                        "spanNulls": true,
                        "stacking": {
                          "group": "A",
                          "mode": "none"
                        },
                        "thresholdsStyle": {
                          "mode": "line+area"
                        }
                      },
                      "mappings": [],
                      "max": 12,
                      "min": 0,
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "transparent",
                            "value": null
                          },
                          {
                            "color": "red",
                            "value": 10
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 6,
                    "w": 12,
                    "x": 12,
                    "y": 16
                  },
                  "id": 11,
                  "options": {
                    "legend": {
                      "calcs": [],
                      "displayMode": "list",
                      "placement": "bottom",
                      "showLegend": true
                    },
                    "tooltip": {
                      "mode": "multi",
                      "sort": "desc"
                    }
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "sum(kube_deployment_status_replicas{deployment=\"party-pic-server\"}) or vector(0)",
                      "legendFormat": "Server Pods",
                      "refId": "A"
                    },
                    {
                      "expr": "sum(kube_deployment_status_replicas{deployment=\"party-pic-client\"}) or vector(0)",
                      "legendFormat": "Client Pods",
                      "refId": "B"
                    }
                  ],
                  "title": "Pod Scaling Timeline (HPA)",
                  "type": "timeseries"
                }
              ],
              "preload": false,
              "refresh": "30s",
              "schemaVersion": 42,
              "tags": [],
              "templating": {
                "list": []
              },
              "time": {
                "from": "now-1h",
                "to": "now"
              },
              "timepicker": {},
              "timezone": "",
              "title": "Application Metrics",
              "uid": "app-metrics",
              "version": 1
            }
        # ======================================================================
        # 2. INFRASTRUCTURE METRICS
        # ======================================================================
        infrastructure-metrics:
          json: |
            {
              "annotations": {
                "list": [
                  {
                    "builtIn": 1,
                    "datasource": {
                      "type": "grafana",
                      "uid": "-- Grafana --"
                    },
                    "enable": true,
                    "hide": true,
                    "iconColor": "rgba(0, 211, 255, 1)",
                    "name": "Annotations & Alerts",
                    "type": "dashboard"
                  }
                ]
              },
              "editable": true,
              "fiscalYearStartMonth": 0,
              "graphTooltip": 0,
              "links": [],
              "liveNow": false,
              "panels": [
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "palette-classic"
                      },
                      "custom": {
                        "axisCenteredZero": false,
                        "axisColorMode": "text",
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "drawStyle": "line",
                        "fillOpacity": 0,
                        "gradientMode": "none",
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        },
                        "insertNulls": false,
                        "lineInterpolation": "linear",
                        "lineWidth": 1,
                        "pointSize": 5,
                        "scaleDistribution": {
                          "type": "linear"
                        },
                        "showPoints": "auto",
                        "spanNulls": false,
                        "stacking": {
                          "group": "A",
                          "mode": "none"
                        },
                        "thresholdsStyle": {
                          "mode": "off"
                        }
                      },
                      "mappings": [],
                      "max": 100,
                      "min": 0,
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": null
                          },
                          {
                            "color": "red",
                            "value": 80
                          }
                        ]
                      },
                      "unit": "percent"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 12,
                    "x": 0,
                    "y": 0
                  },
                  "id": 1,
                  "options": {
                    "legend": {
                      "calcs": [],
                      "displayMode": "list",
                      "placement": "bottom",
                      "showLegend": true
                    },
                    "tooltip": {
                      "mode": "single",
                      "sort": "none"
                    }
                  },
                  "targets": [
                    {
                      "expr": "(1 - avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m]))) * 100",
                      "legendFormat": "{{instance}}",
                      "refId": "A"
                    }
                  ],
                  "title": "CPU Usage per Node",
                  "type": "timeseries"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "palette-classic"
                      },
                      "custom": {
                        "axisCenteredZero": false,
                        "axisColorMode": "text",
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "drawStyle": "line",
                        "fillOpacity": 0,
                        "gradientMode": "none",
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        },
                        "insertNulls": false,
                        "lineInterpolation": "linear",
                        "lineWidth": 1,
                        "pointSize": 5,
                        "scaleDistribution": {
                          "type": "linear"
                        },
                        "showPoints": "auto",
                        "spanNulls": false,
                        "stacking": {
                          "group": "A",
                          "mode": "none"
                        },
                        "thresholdsStyle": {
                          "mode": "off"
                        }
                      },
                      "mappings": [],
                      "max": 100,
                      "min": 0,
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": null
                          },
                          {
                            "color": "red",
                            "value": 80
                          }
                        ]
                      },
                      "unit": "percent"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 12,
                    "x": 12,
                    "y": 0
                  },
                  "id": 2,
                  "options": {
                    "legend": {
                      "calcs": [],
                      "displayMode": "list",
                      "placement": "bottom",
                      "showLegend": true
                    },
                    "tooltip": {
                      "mode": "single",
                      "sort": "none"
                    }
                  },
                  "targets": [
                    {
                      "expr": "(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100",
                      "legendFormat": "{{instance}}",
                      "refId": "A"
                    }
                  ],
                  "title": "Memory Usage per Node",
                  "type": "timeseries"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "mappings": [],
                      "max": 100,
                      "min": 0,
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": null
                          },
                          {
                            "color": "yellow",
                            "value": 60
                          },
                          {
                            "color": "red",
                            "value": 80
                          }
                        ]
                      },
                      "unit": "percent"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 6,
                    "w": 6,
                    "x": 0,
                    "y": 8
                  },
                  "id": 3,
                  "options": {
                    "orientation": "auto",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showThresholdLabels": false,
                    "showThresholdMarkers": true
                  },
                  "pluginVersion": "10.1.5",
                  "targets": [
                    {
                      "expr": "(1 - avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m]))) * 100",
                      "refId": "A"
                    }
                  ],
                  "title": "CPU Usage (Cluster Average)",
                  "type": "gauge"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "mappings": [],
                      "max": 100,
                      "min": 0,
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": null
                          },
                          {
                            "color": "yellow",
                            "value": 70
                          },
                          {
                            "color": "red",
                            "value": 85
                          }
                        ]
                      },
                      "unit": "percent"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 6,
                    "w": 6,
                    "x": 6,
                    "y": 8
                  },
                  "id": 4,
                  "options": {
                    "orientation": "auto",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showThresholdLabels": false,
                    "showThresholdMarkers": true
                  },
                  "pluginVersion": "10.1.5",
                  "targets": [
                    {
                      "expr": "avg((1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)",
                      "refId": "A"
                    }
                  ],
                  "title": "Memory Usage (Cluster Average)",
                  "type": "gauge"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "mappings": [],
                      "max": 100,
                      "min": 0,
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": null
                          },
                          {
                            "color": "yellow",
                            "value": 70
                          },
                          {
                            "color": "red",
                            "value": 90
                          }
                        ]
                      },
                      "unit": "percent"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 6,
                    "w": 6,
                    "x": 12,
                    "y": 8
                  },
                  "id": 5,
                  "options": {
                    "orientation": "auto",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showThresholdLabels": false,
                    "showThresholdMarkers": true
                  },
                  "pluginVersion": "10.1.5",
                  "targets": [
                    {
                      "expr": "(1 - node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"}) * 100",
                      "refId": "A"
                    }
                  ],
                  "title": "Disk Usage",
                  "type": "gauge"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "red",
                            "value": null
                          },
                          {
                            "color": "yellow",
                            "value": 5000000000
                          },
                          {
                            "color": "green",
                            "value": 10000000000
                          }
                        ]
                      },
                      "unit": "bytes"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 6,
                    "w": 6,
                    "x": 18,
                    "y": 8
                  },
                  "id": 6,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "textMode": "auto"
                  },
                  "pluginVersion": "10.1.5",
                  "targets": [
                    {
                      "expr": "sum(node_filesystem_avail_bytes{mountpoint=\"/\"})",
                      "refId": "A"
                    }
                  ],
                  "title": "Disk Space Free",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "palette-classic"
                      },
                      "custom": {
                        "axisCenteredZero": false,
                        "axisColorMode": "text",
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "drawStyle": "line",
                        "fillOpacity": 0,
                        "gradientMode": "none",
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        },
                        "insertNulls": false,
                        "lineInterpolation": "linear",
                        "lineWidth": 1,
                        "pointSize": 5,
                        "scaleDistribution": {
                          "type": "linear"
                        },
                        "showPoints": "auto",
                        "spanNulls": false,
                        "stacking": {
                          "group": "A",
                          "mode": "none"
                        },
                        "thresholdsStyle": {
                          "mode": "off"
                        }
                      },
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": null
                          },
                          {
                            "color": "red",
                            "value": 80
                          }
                        ]
                      },
                      "unit": "Bps"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 12,
                    "x": 0,
                    "y": 14
                  },
                  "id": 7,
                  "options": {
                    "legend": {
                      "calcs": [],
                      "displayMode": "list",
                      "placement": "bottom",
                      "showLegend": true
                    },
                    "tooltip": {
                      "mode": "single",
                      "sort": "none"
                    }
                  },
                  "targets": [
                    {
                      "expr": "sum by (instance) (rate(node_network_receive_bytes_total{device!~\"lo|veth.*|docker.*|cni.*\"}[5m]))",
                      "legendFormat": "{{instance}}",
                      "refId": "A"
                    }
                  ],
                  "title": "Network Throughput - Receive",
                  "type": "timeseries"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "palette-classic"
                      },
                      "custom": {
                        "axisCenteredZero": false,
                        "axisColorMode": "text",
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "drawStyle": "line",
                        "fillOpacity": 0,
                        "gradientMode": "none",
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        },
                        "insertNulls": false,
                        "lineInterpolation": "linear",
                        "lineWidth": 1,
                        "pointSize": 5,
                        "scaleDistribution": {
                          "type": "linear"
                        },
                        "showPoints": "auto",
                        "spanNulls": false,
                        "stacking": {
                          "group": "A",
                          "mode": "none"
                        },
                        "thresholdsStyle": {
                          "mode": "off"
                        }
                      },
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": null
                          },
                          {
                            "color": "red",
                            "value": 80
                          }
                        ]
                      },
                      "unit": "Bps"
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 12,
                    "x": 12,
                    "y": 14
                  },
                  "id": 8,
                  "options": {
                    "legend": {
                      "calcs": [],
                      "displayMode": "list",
                      "placement": "bottom",
                      "showLegend": true
                    },
                    "tooltip": {
                      "mode": "single",
                      "sort": "none"
                    }
                  },
                  "targets": [
                    {
                      "expr": "sum by (instance) (rate(node_network_transmit_bytes_total{device!~\"lo|veth.*|docker.*|cni.*\"}[5m]))",
                      "legendFormat": "{{instance}}",
                      "refId": "A"
                    }
                  ],
                  "title": "Network Throughput - Transmit",
                  "type": "timeseries"
                }
              ],
              "refresh": "30s",
              "schemaVersion": 38,
              "style": "dark",
              "tags": [],
              "templating": {
                "list": []
              },
              "time": {
                "from": "now-1h",
                "to": "now"
              },
              "timepicker": {},
              "timezone": "",
              "title": "Infrastructure Metrics",
              "uid": "infra-metrics",
              "version": 1,
              "weekStart": ""
            }
        # ======================================================================
        # 3. KUBERNETES METRICS
        # ======================================================================
        kubernetes-metrics:
          json: |
            {
              "annotations": {
                "list": [
                  {
                    "builtIn": 1,
                    "datasource": {
                      "type": "grafana",
                      "uid": "-- Grafana --"
                    },
                    "enable": true,
                    "hide": true,
                    "iconColor": "rgba(0, 211, 255, 1)",
                    "name": "Annotations & Alerts",
                    "type": "dashboard"
                  }
                ]
              },
              "editable": true,
              "fiscalYearStartMonth": 0,
              "graphTooltip": 0,
              "id": 2,
              "links": [],
              "panels": [
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "palette-classic"
                      },
                      "custom": {
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        }
                      },
                      "mappings": []
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 8,
                    "x": 0,
                    "y": 0
                  },
                  "id": 1,
                  "options": {
                    "legend": {
                      "displayMode": "list",
                      "placement": "bottom",
                      "showLegend": true
                    },
                    "pieType": "pie",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "sort": "desc",
                    "tooltip": {
                      "hideZeros": false,
                      "mode": "single",
                      "sort": "none"
                    }
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "sum by (phase) (kube_pod_status_phase)",
                      "legendFormat": "{{phase}}",
                      "refId": "A"
                    }
                  ],
                  "title": "Pods by Status",
                  "type": "piechart"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Ready Nodes",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 4,
                    "x": 8,
                    "y": 0
                  },
                  "id": 2,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "sum(kube_node_status_condition{condition=\"Ready\",status=\"true\"})",
                      "refId": "A"
                    }
                  ],
                  "title": "Nodes Ready",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Total Nodes",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "blue",
                            "value": 0
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 4,
                    "x": 12,
                    "y": 0
                  },
                  "id": 3,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "count(kube_node_info)",
                      "refId": "A"
                    }
                  ],
                  "title": "Total Nodes",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Running",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 4,
                    "x": 16,
                    "y": 0
                  },
                  "id": 4,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "sum(kube_pod_status_phase{phase=\"Running\"})",
                      "refId": "A"
                    }
                  ],
                  "title": "Running Pods",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Failed",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          },
                          {
                            "color": "red",
                            "value": 1
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 4,
                    "x": 20,
                    "y": 0
                  },
                  "id": 5,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "sum(kube_pod_status_phase{phase=\"Failed\"}) or vector(0)",
                      "refId": "A"
                    }
                  ],
                  "title": "Failed Pods",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Pending",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          },
                          {
                            "color": "yellow",
                            "value": 1
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 4,
                    "x": 8,
                    "y": 4
                  },
                  "id": 6,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "sum(kube_pod_status_phase{phase=\"Pending\"}) or vector(0)",
                      "refId": "A"
                    }
                  ],
                  "title": "Pods Not Ready",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Restarts",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          },
                          {
                            "color": "yellow",
                            "value": 3
                          },
                          {
                            "color": "red",
                            "value": 10
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 4,
                    "x": 12,
                    "y": 4
                  },
                  "id": 7,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "sum(increase(kube_pod_container_status_restarts_total[15m]))",
                      "refId": "A"
                    }
                  ],
                  "title": "Container Restarts (15m)",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Active NS",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "blue",
                            "value": 0
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 4,
                    "x": 16,
                    "y": 4
                  },
                  "id": 8,
                  "options": {
                    "colorMode": "value",
                    "graphMode": "area",
                    "justifyMode": "auto",
                    "orientation": "auto",
                    "percentChangeColorMode": "standard",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showPercentChange": false,
                    "textMode": "auto",
                    "wideLayout": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "count(kube_namespace_status_phase{phase=\"Active\"})",
                      "refId": "A"
                    }
                  ],
                  "title": "Namespaces",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "custom": {
                        "align": "auto",
                        "cellOptions": {
                          "type": "auto"
                        },
                        "footer": {
                          "reducers": []
                        },
                        "inspect": false
                      },
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": 0
                          },
                          {
                            "color": "red",
                            "value": 80
                          }
                        ]
                      }
                    },
                    "overrides": [
                      {
                        "matcher": {
                          "id": "byName",
                          "options": "pod"
                        },
                        "properties": [
                          {
                            "id": "custom.width",
                            "value": 399
                          }
                        ]
                      },
                      {
                        "matcher": {
                          "id": "byName",
                          "options": "endpoint"
                        },
                        "properties": [
                          {
                            "id": "custom.width",
                            "value": 56
                          }
                        ]
                      },
                      {
                        "matcher": {
                          "id": "byName",
                          "options": "namespace"
                        },
                        "properties": [
                          {
                            "id": "custom.width",
                            "value": 101
                          }
                        ]
                      },
                      {
                        "matcher": {
                          "id": "byName",
                          "options": "Node"
                        },
                        "properties": [
                          {
                            "id": "custom.width",
                            "value": 137
                          }
                        ]
                      },
                      {
                        "matcher": {
                          "id": "byName",
                          "options": "service"
                        },
                        "properties": [
                          {
                            "id": "custom.width",
                            "value": 280
                          }
                        ]
                      }
                    ]
                  },
                  "gridPos": {
                    "h": 6,
                    "w": 24,
                    "x": 0,
                    "y": 8
                  },
                  "id": 12,
                  "options": {
                    "cellHeight": "sm",
                    "showHeader": true
                  },
                  "pluginVersion": "12.3.1",
                  "targets": [
                    {
                      "expr": "kube_node_status_condition{status=\"true\"}",
                      "format": "table",
                      "instant": true,
                      "legendFormat": "",
                      "refId": "A"
                    }
                  ],
                  "title": "Node Conditions",
                  "transformations": [
                    {
                      "id": "organize",
                      "options": {
                        "excludeByName": {
                          "Time": true,
                          "__name__": true,
                          "instance": true,
                          "job": true,
                          "status": true
                        },
                        "renameByName": {
                          "Value": "Status",
                          "condition": "Condition",
                          "node": "Node"
                        }
                      }
                    }
                  ],
                  "type": "table"
                }
              ],
              "preload": false,
              "refresh": "30s",
              "schemaVersion": 42,
              "tags": [],
              "templating": {
                "list": []
              },
              "time": {
                "from": "now-1h",
                "to": "now"
              },
              "timepicker": {},
              "timezone": "",
              "title": "Kubernetes Metrics",
              "uid": "k8s-metrics",
              "version": 1
            }
        # ======================================================================
        # 4. SYSTEM OVERVIEW (Custom)
        # ======================================================================
        system-overview:
          json: |
            {

              "annotations": {

                "list": [

                  {

                    "builtIn": 1,

                    "datasource": {

                      "type": "grafana",

                      "uid": "-- Grafana --"

                    },

                    "enable": true,

                    "hide": true,

                    "iconColor": "rgba(0, 211, 255, 1)",

                    "name": "Annotations & Alerts",

                    "type": "dashboard"

                  }

                ]

              },

              "editable": true,

              "fiscalYearStartMonth": 0,

              "graphTooltip": 0,

              "id": 5,

              "links": [],

              "panels": [

                {

                  "fieldConfig": {

                    "defaults": {

                      "mappings": [],

                      "max": 100,

                      "min": 0,

                      "thresholds": {

                        "mode": "absolute",

                        "steps": [

                          {

                            "color": "red",

                            "value": 0

                          },

                          {

                            "color": "yellow",

                            "value": 70

                          },

                          {

                            "color": "green",

                            "value": 90

                          }

                        ]

                      },

                      "unit": "percent"

                    },

                    "overrides": []

                  },

                  "gridPos": {

                    "h": 8,

                    "w": 6,

                    "x": 0,

                    "y": 0

                  },

                  "id": 1,

                  "options": {

                    "minVizHeight": 75,

                    "minVizWidth": 75,

                    "orientation": "auto",

                    "reduceOptions": {

                      "calcs": [

                        "lastNotNull"

                      ],

                      "fields": "",

                      "values": false

                    },

                    "showThresholdLabels": false,

                    "showThresholdMarkers": true,

                    "sizing": "auto"

                  },

                  "pluginVersion": "12.3.1",

                  "targets": [

                    {

                      "expr": "(sum(kube_pod_status_phase{phase=~\"Running|Succeeded\"}) / sum(kube_pod_status_phase)) * 100",

                      "refId": "A"

                    }

                  ],

                  "title": "System Health",

                  "type": "gauge"

                },

                {

                  "fieldConfig": {

                    "defaults": {

                      "color": {

                        "mode": "thresholds"

                      },

                      "displayName": "Sessions",

                      "mappings": [],

                      "thresholds": {

                        "mode": "absolute",

                        "steps": [

                          {

                            "color": "blue",

                            "value": 0

                          }

                        ]

                      }

                    },

                    "overrides": []

                  },

                  "gridPos": {

                    "h": 4,

                    "w": 6,

                    "x": 6,

                    "y": 0

                  },

                  "id": 2,

                  "options": {

                    "colorMode": "value",

                    "graphMode": "area",

                    "justifyMode": "auto",

                    "orientation": "auto",

                    "percentChangeColorMode": "standard",

                    "reduceOptions": {

                      "calcs": [

                        "lastNotNull"

                      ],

                      "fields": "",

                      "values": false

                    },

                    "showPercentChange": false,

                    "textMode": "auto",

                    "wideLayout": true

                  },

                  "pluginVersion": "12.3.1",

                  "targets": [

                    {

                      "expr": "max(partypic_active_sessions) or vector(0)",

                      "refId": "A"

                    }

                  ],

                  "title": "Aktive Sessions",

                  "type": "stat"

                },

                {

                  "fieldConfig": {

                    "defaults": {

                      "color": {

                        "mode": "thresholds"

                      },

                      "displayName": "Users Online",

                      "mappings": [],

                      "thresholds": {

                        "mode": "absolute",

                        "steps": [

                          {

                            "color": "green",

                            "value": 0

                          }

                        ]

                      }

                    },

                    "overrides": []

                  },

                  "gridPos": {

                    "h": 4,

                    "w": 6,

                    "x": 12,

                    "y": 0

                  },

                  "id": 3,

                  "options": {

                    "colorMode": "value",

                    "graphMode": "area",

                    "justifyMode": "auto",

                    "orientation": "auto",

                    "percentChangeColorMode": "standard",

                    "reduceOptions": {

                      "calcs": [

                        "lastNotNull"

                      ],

                      "fields": "",

                      "values": false

                    },

                    "showPercentChange": false,

                    "textMode": "auto",

                    "wideLayout": true

                  },

                  "pluginVersion": "12.3.1",

                  "targets": [

                    {

                      "expr": "max(partypic_users_online) or vector(0)",

                      "refId": "A"

                    }

                  ],

                  "title": "Aktive User",

                  "type": "stat"

                },

                {

                  "datasource": {

                    "type": "prometheus"

                  },

                  "fieldConfig": {

                    "defaults": {

                      "color": {

                        "mode": "thresholds"

                      },

                      "decimals": 3,

                      "mappings": [],

                      "thresholds": {

                        "mode": "absolute",

                        "steps": [

                          {

                            "color": "green",

                            "value": 0

                          },

                          {

                            "color": "yellow",

                            "value": 0.1

                          },

                          {

                            "color": "orange",

                            "value": 0.2

                          }

                        ]

                      },

                      "unit": "currencyUSD"

                    },

                    "overrides": []

                  },

                  "gridPos": {

                    "h": 4,

                    "w": 6,

                    "x": 18,

                    "y": 0

                  },

                  "id": 4,

                  "options": {

                    "colorMode": "value",

                    "graphMode": "area",

                    "justifyMode": "auto",

                    "orientation": "auto",

                    "percentChangeColorMode": "standard",

                    "reduceOptions": {

                      "calcs": [

                        "lastNotNull"

                      ],

                      "fields": "",

                      "values": false

                    },

                    "showPercentChange": false,

                    "textMode": "auto",

                    "wideLayout": true

                  },

                  "pluginVersion": "12.3.1",

                  "targets": [

                    {

                      "editorMode": "code",

                      "expr": "(count(kube_node_info) OR vector(0)) * 0.0416\n+\n(count(kube_service_spec_type{type=\"LoadBalancer\"}) OR vector(0)) * 0.025\n+\n(sum(kube_persistentvolume_capacity_bytes) OR vector(0)) / 1024 / 1024 / 1024 * 0.08 / 730",

                      "range": true,

                      "refId": "A"

                    }

                  ],

                  "title": "Geschaetzte Kosten/Stunde",

                  "type": "stat"

                },

                {

                  "fieldConfig": {

                    "defaults": {

                      "color": {

                        "mode": "thresholds"

                      },

                      "displayName": "Pods Running",

                      "mappings": [],

                      "thresholds": {

                        "mode": "absolute",

                        "steps": [

                          {

                            "color": "green",

                            "value": 0

                          }

                        ]

                      }

                    },

                    "overrides": []

                  },

                  "gridPos": {

                    "h": 4,

                    "w": 6,

                    "x": 6,

                    "y": 4

                  },

                  "id": 5,

                  "options": {

                    "colorMode": "value",

                    "graphMode": "area",

                    "justifyMode": "auto",

                    "orientation": "auto",

                    "percentChangeColorMode": "standard",

                    "reduceOptions": {

                      "calcs": [

                        "lastNotNull"

                      ],

                      "fields": "",

                      "values": false

                    },

                    "showPercentChange": false,

                    "textMode": "auto",

                    "wideLayout": true

                  },

                  "pluginVersion": "12.3.1",

                  "targets": [

                    {

                      "expr": "sum(kube_pod_status_phase{phase=\"Running\"})",

                      "refId": "A"

                    }

                  ],

                  "title": "Running Pods",

                  "type": "stat"

                },

                {

                  "fieldConfig": {

                    "defaults": {

                      "mappings": [],

                      "max": 100,

                      "min": 0,

                      "thresholds": {

                        "mode": "absolute",

                        "steps": [

                          {

                            "color": "green",

                            "value": 0

                          },

                          {

                            "color": "yellow",

                            "value": 60

                          },

                          {

                            "color": "red",

                            "value": 80

                          }

                        ]

                      },

                      "unit": "percent"

                    },

                    "overrides": []

                  },

                  "gridPos": {

                    "h": 4,

                    "w": 6,

                    "x": 12,

                    "y": 4

                  },

                  "id": 7,

                  "options": {

                    "minVizHeight": 75,

                    "minVizWidth": 75,

                    "orientation": "auto",

                    "reduceOptions": {

                      "calcs": [

                        "lastNotNull"

                      ],

                      "fields": "",

                      "values": false

                    },

                    "showThresholdLabels": false,

                    "showThresholdMarkers": true,

                    "sizing": "auto"

                  },

                  "pluginVersion": "12.3.1",

                  "targets": [

                    {

                      "expr": "(1 - avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m]))) * 100",

                      "refId": "A"

                    }

                  ],

                  "title": "CPU Auslastung",

                  "type": "gauge"

                },

                {

                  "datasource": {

                    "type": "prometheus",

                    "uid": "PBFA97CFB590B2093"

                  },

                  "fieldConfig": {

                    "defaults": {

                      "color": {

                        "mode": "thresholds"

                      },

                      "decimals": 2,

                      "mappings": [],

                      "thresholds": {

                        "mode": "absolute",

                        "steps": [

                          {

                            "color": "green",

                            "value": 0

                          },

                          {

                            "color": "yellow",

                            "value": 50

                          },

                          {

                            "color": "orange",

                            "value": 100

                          }

                        ]

                      },

                      "unit": "currencyUSD"

                    },

                    "overrides": []

                  },

                  "gridPos": {

                    "h": 4,

                    "w": 6,

                    "x": 18,

                    "y": 4

                  },

                  "id": 14,

                  "options": {

                    "colorMode": "value",

                    "graphMode": "area",

                    "justifyMode": "auto",

                    "orientation": "auto",

                    "percentChangeColorMode": "standard",

                    "reduceOptions": {

                      "calcs": [

                        "lastNotNull"

                      ],

                      "fields": "",

                      "values": false

                    },

                    "showPercentChange": false,

                    "textMode": "auto",

                    "wideLayout": true

                  },

                  "pluginVersion": "12.3.1",

                  "targets": [

                    {

                      "editorMode": "code",

                      "expr": "(\n  ((count(kube_node_info) OR vector(0)) * 0.0416)\n  +\n  ((count(kube_service_spec_type{type=\"LoadBalancer\"}) OR vector(0)) * 0.025)\n  +\n  ((sum(kube_persistentvolume_capacity_bytes) OR vector(0)) / 1024 / 1024 / 1024 * 0.08 / 730)\n) * 730",

                      "range": true,

                      "refId": "A"

                    }

                  ],

                  "title": "Geschaetzte Kosten/Monat",

                  "type": "stat"

                },

                {

                  "datasource": {

                    "type": "loki",

                    "uid": "loki"

                  },

                  "fieldConfig": {

                    "defaults": {},

                    "overrides": []

                  },

                  "gridPos": {

                    "h": 10,

                    "w": 24,

                    "x": 0,

                    "y": 8

                  },

                  "id": 8,

                  "options": {

                    "dedupStrategy": "none",

                    "enableInfiniteScrolling": false,

                    "enableLogDetails": true,

                    "prettifyLogMessage": false,

                    "showCommonLabels": false,

                    "showControls": false,

                    "showLabels": true,

                    "showTime": true,

                    "sortOrder": "Descending",

                    "wrapLogMessage": true

                  },

                  "pluginVersion": "12.3.1",

                  "targets": [

                    {

                      "expr": "{namespace=~\".+\"} |~ \"(?i)error|fail|exception|crash|fatal\"",

                      "refId": "A"

                    }

                  ],

                  "title": "Letzte Fehler (Logs)",

                  "type": "logs"

                }

              ],

              "preload": false,

              "refresh": "30s",

              "schemaVersion": 42,

              "tags": [],

              "templating": {

                "list": []

              },

              "time": {

                "from": "now-1h",

                "to": "now"

              },

              "timepicker": {},

              "timezone": "",

              "title": "System Overview",

              "uid": "system-overview",

              "version": 1
            }