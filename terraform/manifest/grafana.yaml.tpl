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


    persistence:
      enabled: true
      storageClassName: gp3
      size: ${grafana_storage_size}

    service:
      type: NodePort
      port: 30080
      
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
                      "mode": "single",
                      "sort": "none"
                    }
                  },
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
                      "mode": "single",
                      "sort": "none"
                    }
                  },
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
                            "value": null
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
                      "expr": "(sum(rate(partypic_http_requests_total{status=~\"5..\"}[5m])) / sum(rate(partypic_http_requests_total[5m])) * 100) or (sum(rate(nginx_ingress_controller_requests{status=~\"5..\"}[5m])) / sum(rate(nginx_ingress_controller_requests[5m])) * 100) or vector(0)",
                      "refId": "A"
                    }
                  ],
                  "title": "Error Rate (%)",
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
                    "tooltip": {
                      "mode": "single",
                      "sort": "none"
                    }
                  },
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
                            "value": null
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
                      "expr": "partypic_active_sessions or vector(0)",
                      "refId": "A"
                    }
                  ],
                  "title": "Active Sessions (PartyPic)",
                  "type": "stat"
                },
                {
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
                            "value": null
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
                      "expr": "partypic_users_online or vector(0)",
                      "refId": "A"
                    }
                  ],
                  "title": "Users Online (PartyPic)",
                  "type": "stat"
                },
                {
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
                            "value": null
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
                      "expr": "partypic_photos_uploaded_total or vector(0)",
                      "refId": "A"
                    }
                  ],
                  "title": "Photos Uploaded (PartyPic)",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "custom": {
                        "hideFrom": {
                          "legend": false,
                          "tooltip": false,
                          "viz": false
                        },
                        "scaleDistribution": {
                          "type": "linear"
                        }
                      }
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
                    "calculate": true,
                    "calculation": {},
                    "cellGap": 2,
                    "cellValues": {},
                    "color": {
                      "exponent": 0.5,
                      "fill": "dark-orange",
                      "mode": "scheme",
                      "reverse": false,
                      "scale": "exponential",
                      "scheme": "Oranges",
                      "steps": 128
                    },
                    "exemplars": {
                      "color": "rgba(255,0,255,0.7)"
                    },
                    "filterValues": {
                      "le": 1e-9
                    },
                    "legend": {
                      "show": false
                    },
                    "rowsFrame": {
                      "layout": "auto"
                    },
                    "showValue": "never",
                    "tooltip": {
                      "show": false,
                      "yHistogram": false
                    },
                    "yAxis": {
                      "axisPlacement": "left",
                      "reverse": false
                    }
                  },
                  "pluginVersion": "10.1.5",
                  "targets": [
                    {
                      "expr": "sum(increase(nginx_ingress_controller_request_duration_seconds_bucket[5m])) by (le)",
                      "legendFormat": "{{le}}",
                      "refId": "A"
                    }
                  ],
                  "title": "Request Duration Distribution",
                  "type": "heatmap"
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
              "title": "Application Metrics",
              "uid": "app-metrics",
              "version": 1,
              "weekStart": ""
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
                      "color": {
                        "mode": "thresholds"
                      },
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
                    "tooltip": {
                      "mode": "single",
                      "sort": "none"
                    }
                  },
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
                            "value": null
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
                            "value": null
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
                            "value": null
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
                            "value": null
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
                            "value": null
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
                            "value": null
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
                            "value": null
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
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Bound PVCs",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": null
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
                    "y": 4
                  },
                  "id": 9,
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
                      "expr": "count(kube_persistentvolumeclaim_status_phase{phase=\"Bound\"})",
                      "refId": "A"
                    }
                  ],
                  "title": "PVCs Bound",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
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
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 12,
                    "x": 0,
                    "y": 8
                  },
                  "id": 10,
                  "options": {
                    "displayMode": "gradient",
                    "minVizHeight": 10,
                    "minVizWidth": 0,
                    "orientation": "horizontal",
                    "reduceOptions": {
                      "calcs": [
                        "lastNotNull"
                      ],
                      "fields": "",
                      "values": false
                    },
                    "showUnfilled": true,
                    "valueMode": "color"
                  },
                  "pluginVersion": "10.1.5",
                  "targets": [
                    {
                      "expr": "sum by (namespace) (kube_pod_status_phase{phase=\"Running\"})",
                      "legendFormat": "{{namespace}}",
                      "refId": "A"
                    }
                  ],
                  "title": "Pods per Namespace",
                  "type": "bargauge"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "custom": {
                        "align": "auto",
                        "cellOptions": {
                          "type": "auto"
                        },
                        "inspect": false
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
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 12,
                    "x": 12,
                    "y": 8
                  },
                  "id": 11,
                  "options": {
                    "cellHeight": "sm",
                    "footer": {
                      "countRows": false,
                      "fields": "",
                      "reducer": [
                        "sum"
                      ],
                      "show": false
                    },
                    "showHeader": true
                  },
                  "pluginVersion": "10.1.5",
                  "targets": [
                    {
                      "expr": "kube_deployment_status_replicas_available",
                      "format": "table",
                      "instant": true,
                      "legendFormat": "{{namespace}}/{{deployment}}",
                      "refId": "A"
                    }
                  ],
                  "title": "Deployment Status",
                  "transformations": [
                    {
                      "id": "organize",
                      "options": {
                        "excludeByName": {
                          "Time": true,
                          "__name__": true,
                          "instance": true,
                          "job": true
                        },
                        "renameByName": {
                          "Value": "Available Replicas",
                          "deployment": "Deployment",
                          "namespace": "Namespace"
                        }
                      }
                    }
                  ],
                  "type": "table"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "custom": {
                        "align": "auto",
                        "cellOptions": {
                          "type": "auto"
                        },
                        "inspect": false
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
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 6,
                    "w": 24,
                    "x": 0,
                    "y": 16
                  },
                  "id": 12,
                  "options": {
                    "cellHeight": "sm",
                    "footer": {
                      "countRows": false,
                      "fields": "",
                      "reducer": [
                        "sum"
                      ],
                      "show": false
                    },
                    "showHeader": true
                  },
                  "pluginVersion": "10.1.5",
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
              "title": "Kubernetes Metrics",
              "uid": "k8s-metrics",
              "version": 1,
              "weekStart": ""
            }
        # ======================================================================
        # 4. LOADBALANCER STATS (Custom)
        # ======================================================================
        loadbalancer-stats:
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
                        "mode": "thresholds"
                      },
                      "displayName": "Active LBs",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "blue",
                            "value": null
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
                    "y": 0
                  },
                  "id": 1,
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
                      "expr": "count(kube_service_spec_type{type=\"LoadBalancer\"})",
                      "refId": "A"
                    }
                  ],
                  "title": "LoadBalancer Services",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "TCP Established",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "green",
                            "value": null
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
                      "expr": "sum(node_netstat_Tcp_CurrEstab)",
                      "refId": "A"
                    }
                  ],
                  "title": "Total TCP Connections",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
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
                      "unit": "Bps"
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
                      "expr": "sum(rate(node_network_receive_bytes_total{device!~\"lo|veth.*|docker.*|flannel.*|cni.*\"}[5m]))",
                      "refId": "A"
                    }
                  ],
                  "title": "Network In",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "blue",
                            "value": null
                          }
                        ]
                      },
                      "unit": "Bps"
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
                      "expr": "sum(rate(node_network_transmit_bytes_total{device!~\"lo|veth.*|docker.*|flannel.*|cni.*\"}[5m]))",
                      "refId": "A"
                    }
                  ],
                  "title": "Network Out",
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
                    "y": 4
                  },
                  "id": 5,
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
                      "expr": "sum(rate(node_network_receive_bytes_total{device!~\"lo|veth.*\"}[5m]))",
                      "legendFormat": "Inbound",
                      "refId": "A"
                    },
                    {
                      "expr": "sum(rate(node_network_transmit_bytes_total{device!~\"lo|veth.*\"}[5m]))",
                      "legendFormat": "Outbound",
                      "refId": "B"
                    }
                  ],
                  "title": "Network Traffic (In/Out)",
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
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 8,
                    "w": 12,
                    "x": 12,
                    "y": 4
                  },
                  "id": 6,
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
                      "expr": "node_netstat_Tcp_CurrEstab",
                      "legendFormat": "{{instance}}",
                      "refId": "A"
                    }
                  ],
                  "title": "TCP Connections Over Time",
                  "type": "timeseries"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Errors/sec",
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
                            "value": 1
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 8,
                    "x": 0,
                    "y": 12
                  },
                  "id": 7,
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
                      "expr": "sum(rate(node_network_receive_errs_total[5m])) + sum(rate(node_network_transmit_errs_total[5m]))",
                      "refId": "A"
                    }
                  ],
                  "title": "Network Errors",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Drops/sec",
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
                            "value": 1
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 8,
                    "x": 8,
                    "y": 12
                  },
                  "id": 8,
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
                      "expr": "sum(rate(node_network_receive_drop_total[5m])) + sum(rate(node_network_transmit_drop_total[5m]))",
                      "refId": "A"
                    }
                  ],
                  "title": "Dropped Packets",
                  "type": "stat"
                },
                {
                  "fieldConfig": {
                    "defaults": {
                      "color": {
                        "mode": "thresholds"
                      },
                      "displayName": "Active Endpoints",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                            "color": "blue",
                            "value": null
                          }
                        ]
                      }
                    },
                    "overrides": []
                  },
                  "gridPos": {
                    "h": 4,
                    "w": 8,
                    "x": 16,
                    "y": 12
                  },
                  "id": 9,
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
                      "expr": "count(kube_endpoint_address_available)",
                      "refId": "A"
                    }
                  ],
                  "title": "Service Endpoints",
                  "type": "stat"
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
              "title": "LoadBalancer Stats",
              "uid": "loadbalancer-stats",
              "version": 1,
              "weekStart": ""
            }
        # ======================================================================
        # 5. SYSTEM OVERVIEW (Custom)
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
              "links": [],
              "liveNow": false,
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
                            "value": null
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
                            "value": null
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
                      "expr": "partypic_active_sessions or vector(0)",
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
                            "value": null
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
                      "expr": "partypic_users_online or vector(0)",
                      "refId": "A"
                    }
                  ],
                  "title": "Aktive User",
                  "type": "stat"
                },
                {
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
                            "value": null
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
                      "expr": "(count(kube_node_info) * 0.0416) + (count(kube_service_spec_type{type=\"LoadBalancer\"}) * 0.025) + (sum(kube_persistentvolume_capacity_bytes) / 1024 / 1024 / 1024 * 0.08 / 730)",
                      "refId": "A"
                    }
                  ],
                  "title": "Geschätzte Kosten/Stunde",
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
                            "value": null
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
                      "displayName": "Healthy Nodes",
                      "mappings": [],
                      "thresholds": {
                        "mode": "absolute",
                        "steps": [
                          {
                        },
                        {
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
                                    "value": null
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
                              "expr": "((count(kube_node_info) * 0.0416) + (count(kube_service_spec_type{type=\"LoadBalancer\"}) * 0.025) + (sum(kube_persistentvolume_capacity_bytes) / 1024 / 1024 / 1024 * 0.08 / 730)) * 730",
                              "refId": "A"
                            }
                          ],
                          "title": "Geschätzte Kosten/Monat",
                          "type": "stat"
                            "color": "blue",
                            "value": null
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
                    "y": 4
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
                    "h": 4,
                    "w": 6,
                    "x": 18,
                    "y": 4
                  },
                  "id": 7,
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
                  "title": "CPU Auslastung",
                  "type": "gauge"
                },
                {
                  "datasource": {
                    "type": "loki",
                    "uid": "loki"
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
                    "enableLogDetails": true,
                    "prettifyLogMessage": false,
                    "showCommonLabels": false,
                    "showLabels": true,
                    "showTime": true,
                    "sortOrder": "Descending",
                    "wrapLogMessage": true
                  },
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
              "title": "System Overview",
              "uid": "system-overview",
              "version": 6,
              "weekStart": ""
            }