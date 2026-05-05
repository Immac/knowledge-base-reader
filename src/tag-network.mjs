import { normalizeTagCollection, tagSignature } from './tag-model.mjs';

function compareTagNodes(a, b) {
  if ((b.count || 0) !== (a.count || 0)) return (b.count || 0) - (a.count || 0);
  const aLabel = `${a.key}:${a.value}`;
  const bLabel = `${b.key}:${b.value}`;
  return aLabel.localeCompare(bLabel);
}

function compareLayerNodes(a, b) {
  if ((b.count || 0) !== (a.count || 0)) return (b.count || 0) - (a.count || 0);
  const aLabel = `${a.key}:${a.value}`;
  const bLabel = `${b.key}:${b.value}`;
  return aLabel.localeCompare(bLabel);
}

function createNodeMap(articles) {
  const nodes = new Map();

  for (const article of articles || []) {
    const articleTags = normalizeTagCollection(article?.semanticTags ?? article?.displayTags ?? article?.tags ?? []);
    const articleSlug = article?.slug || article?.title || 'article';
    const seen = new Set();

    for (const tag of articleTags) {
      const signature = tagSignature(tag);
      if (seen.has(signature)) continue;
      seen.add(signature);

      if (!nodes.has(signature)) {
        nodes.set(signature, {
          signature,
          key: tag.key,
          value: tag.value,
          label: `${tag.key}:${tag.value}`,
          count: 0,
          articles: [],
          incoming: 0,
          outgoing: 0,
          layer: 0,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        });
      }

      const node = nodes.get(signature);
      node.count += 1;
      if (!node.articles.includes(articleSlug)) {
        node.articles.push(articleSlug);
      }
    }
  }

  return nodes;
}

function createEdgeMap(articles, nodes) {
  const edges = new Map();

  for (const article of articles || []) {
    const tags = normalizeTagCollection(article?.semanticTags ?? article?.displayTags ?? article?.tags ?? []);
    const uniqueTags = [];
    const seen = new Set();

    for (const tag of tags) {
      const signature = tagSignature(tag);
      if (seen.has(signature) || !nodes.has(signature)) continue;
      seen.add(signature);
      uniqueTags.push(nodes.get(signature));
    }

    uniqueTags.sort(compareTagNodes);

    for (let i = 0; i < uniqueTags.length; i += 1) {
      for (let j = i + 1; j < uniqueTags.length; j += 1) {
        const source = uniqueTags[i];
        const target = uniqueTags[j];
        const edgeKey = `${source.signature}->${target.signature}`;
        if (!edges.has(edgeKey)) {
          edges.set(edgeKey, {
            key: edgeKey,
            source: source.signature,
            target: target.signature,
            weight: 0,
            articles: [],
          });
        }

        const edge = edges.get(edgeKey);
        edge.weight += 1;
        const articleSlug = article?.slug || article?.title || 'article';
        if (!edge.articles.includes(articleSlug)) {
          edge.articles.push(articleSlug);
        }
      }
    }
  }

  return edges;
}

function assignLayers(nodes, edges) {
  const orderedNodes = [...nodes.values()].sort(compareTagNodes);
  const incomingMap = new Map();
  const outgoingMap = new Map();

  for (const edge of edges.values()) {
    if (!outgoingMap.has(edge.source)) outgoingMap.set(edge.source, []);
    if (!incomingMap.has(edge.target)) incomingMap.set(edge.target, []);
    outgoingMap.get(edge.source).push(edge);
    incomingMap.get(edge.target).push(edge);
  }

  for (const node of orderedNodes) {
    node.incoming = incomingMap.get(node.signature)?.length || 0;
    node.outgoing = outgoingMap.get(node.signature)?.length || 0;
  }

  for (const node of orderedNodes) {
    const outgoing = outgoingMap.get(node.signature) || [];
    for (const edge of outgoing) {
      const target = nodes.get(edge.target);
      if (!target) continue;
      target.layer = Math.max(target.layer, node.layer + 1);
    }
  }

  return { incomingMap, outgoingMap };
}

function layoutGraph(nodes, edges) {
  const layers = new Map();
  for (const node of nodes.values()) {
    if (!layers.has(node.layer)) layers.set(node.layer, []);
    layers.get(node.layer).push(node);
  }

  const sortedLayers = [...layers.entries()].sort((a, b) => a[0] - b[0]);
  const layerGapX = 240;
  const layerGapY = 90;
  const marginX = 48;
  const marginY = 48;
  const nodeWidth = 180;
  const nodeHeight = 54;

  let maxLayerSize = 0;
  for (const [, layerNodes] of sortedLayers) {
    layerNodes.sort(compareLayerNodes);
    maxLayerSize = Math.max(maxLayerSize, layerNodes.length);
  }

  for (const [layerIndex, layerNodes] of sortedLayers) {
    layerNodes.forEach((node, index) => {
      node.x = marginX + layerIndex * layerGapX;
      node.y = marginY + index * layerGapY;
      node.width = nodeWidth;
      node.height = nodeHeight;
    });
  }

  const width = marginX * 2 + Math.max(1, sortedLayers.length) * layerGapX;
  const height = marginY * 2 + Math.max(nodeHeight, (Math.max(1, maxLayerSize) - 1) * layerGapY + nodeHeight);

  const nodeBySignature = nodes;
  const pathFromTo = (source, target) => {
    const sx = source.x + source.width;
    const sy = source.y + source.height / 2;
    const tx = target.x;
    const ty = target.y + target.height / 2;
    const curve = Math.max(40, (tx - sx) * 0.35);
    return `M ${sx} ${sy} C ${sx + curve} ${sy}, ${tx - curve} ${ty}, ${tx} ${ty}`;
  };

  const laidOutEdges = [...edges.values()].map(edge => {
    const source = nodeBySignature.get(edge.source);
    const target = nodeBySignature.get(edge.target);
    return {
      ...edge,
      path: source && target ? pathFromTo(source, target) : '',
      sourceNode: source,
      targetNode: target,
    };
  });

  return {
    width,
    height,
    layers: sortedLayers.map(([layer, layerNodes]) => ({
      layer,
      nodes: layerNodes.map(node => ({
        signature: node.signature,
        key: node.key,
        value: node.value,
        label: node.label,
        count: node.count,
        articles: node.articles,
        incoming: node.incoming,
        outgoing: node.outgoing,
        layer: node.layer,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      })),
    })),
    nodes: [...nodes.values()].map(node => ({
      signature: node.signature,
      key: node.key,
      value: node.value,
      label: node.label,
      count: node.count,
      articles: node.articles,
      incoming: node.incoming,
      outgoing: node.outgoing,
      layer: node.layer,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    })),
    edges: laidOutEdges.map(edge => ({
      key: edge.key,
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      articles: edge.articles,
      path: edge.path,
    })),
  };
}

export function buildTagDagGraph(articles = []) {
  const nodes = createNodeMap(articles);
  const edges = createEdgeMap(articles, nodes);
  assignLayers(nodes, edges);
  const graph = layoutGraph(nodes, edges);

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    width: graph.width,
    height: graph.height,
    layers: graph.layers,
    nodes: graph.nodes,
    edges: graph.edges,
  };
}
