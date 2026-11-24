import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataManager } from "@syncfusion/ej2-data";
import {
  ConnectorConstraints,
  DataBinding,
  Diagram,
  DiagramComponent,
  DiagramTools,
  HierarchicalTree,
  Inject,
  LayoutAnimation,
  MindMap,
  OverviewComponent,
  PrintAndExport,
  Rect,
  SnapConstraints,
} from "@syncfusion/ej2-react-diagrams";
import type {
  Connector,
  ConnectorModel,
  IClickEventArgs,
  LayoutModel,
  NodeModel,
  TreeInfo,
} from "@syncfusion/ej2-react-diagrams";
import {
  ItemDirective,
  ItemsDirective,
  ToolbarComponent,
} from "@syncfusion/ej2-react-navigations";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { DropDownListComponent } from "@syncfusion/ej2-react-dropdowns";
import { DropDownButtonComponent } from "@syncfusion/ej2-react-splitbuttons";
import PageHeader from "../components/PageHeader";
import { MODULES } from "../components/modules";

const DIAGRAM_MODULE = MODULES.find((module) => module.key === "diagram")!;

type LayoutType = "OrganizationalChart" | "HierarchicalTree" | "MindMap";

type InteractionMode = "Select" | "Pan";
type Orientation =
  | "TopToBottom"
  | "BottomToTop"
  | "LeftToRight"
  | "RightToLeft";
type MindMapOrientation = "Horizontal" | "Vertical";
type NodeCategory = "Executive" | "Division" | "Team" | "Capability";
type SubtreeOptionValue =
  | "VerticalAlternate"
  | "VerticalLeft"
  | "VerticalRight"
  | "HorizontalBalanced"
  | "HorizontalCenter"
  | "HorizontalLeft"
  | "HorizontalRight";
type DiagramExportFormat = "PNG" | "JPG" | "SVG";

interface ProductNode {
  id: string;
  parentId?: string;
  name: string;
  category: NodeCategory;
  branch?: "Left" | "Right";
}

interface SelectOption<Value extends string = string> {
  [key: string]: string;
  text: string;
  value: Value;
}

interface SubtreeOption extends SelectOption<SubtreeOptionValue> {
  orientation: "Vertical" | "Horizontal";
  type: "Alternate" | "Left" | "Right" | "Balanced" | "Center";
}

interface NodeTheme {
  fill: string;
  stroke: string;
  category: string;
  title: string;
}

const isProductNodeData = (value: unknown): value is ProductNode => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "category" in value &&
    (value.category === "Executive" ||
      value.category === "Division" ||
      value.category === "Team" ||
      value.category === "Capability")
  );
};

const productHierarchy: ProductNode[] = [
  {
    id: "engineering",
    name: "Product Engineering",
    category: "Executive",
  },
  {
    id: "platform",
    parentId: "engineering",
    name: "Platform Engineering",
    category: "Division",
    branch: "Left",
  },
  {
    id: "experience",
    parentId: "engineering",
    name: "Product Experience",
    category: "Division",
    branch: "Right",
  },
  {
    id: "data-platform",
    parentId: "platform",
    name: "Data Platform",
    category: "Team",
  },
  {
    id: "developer-platform",
    parentId: "platform",
    name: "Developer Platform",
    category: "Team",
  },
  {
    id: "web-experience",
    parentId: "experience",
    name: "Web Experience",
    category: "Team",
  },
  {
    id: "mobile-experience",
    parentId: "experience",
    name: "Mobile Experience",
    category: "Team",
  },
  {
    id: "analytics-services",
    parentId: "data-platform",
    name: "Analytics Services",
    category: "Capability",
  },
  {
    id: "data-governance",
    parentId: "data-platform",
    name: "Data Governance",
    category: "Capability",
  },
  {
    id: "sdk-foundation",
    parentId: "developer-platform",
    name: "SDK Foundation",
    category: "Capability",
  },
  {
    id: "developer-portal",
    parentId: "developer-platform",
    name: "Developer Portal",
    category: "Capability",
  },
  {
    id: "commerce-experience",
    parentId: "web-experience",
    name: "Commerce Experience",
    category: "Capability",
  },
  {
    id: "account-experience",
    parentId: "web-experience",
    name: "Account Experience",
    category: "Capability",
  },
  {
    id: "mobile-foundation",
    parentId: "mobile-experience",
    name: "Mobile Foundation",
    category: "Capability",
  },
  {
    id: "mobile-commerce",
    parentId: "mobile-experience",
    name: "Mobile Commerce",
    category: "Capability",
  },
];

const getProductNodeBranch = (nodeData: ProductNode) => {
  let currentProductNode: ProductNode | undefined = nodeData;

  while (
    currentProductNode?.parentId &&
    currentProductNode.parentId !== "engineering"
  ) {
    const parentProductNodeId: string = currentProductNode.parentId;
    currentProductNode = productHierarchy.find(
      (productNode) => productNode.id === parentProductNodeId,
    );
  }

  return currentProductNode?.branch === "Left" ? "Left" : "Right";
};

const getMindMapToggleOffset = (
  nodeData: ProductNode,
  orientation: MindMapOrientation,
) => {
  if (orientation === "Horizontal" && nodeData.id === "engineering") {
    return { x: 0.5, y: 1 };
  }

  const branch = getProductNodeBranch(nodeData);

  if (orientation === "Horizontal") {
    return branch === "Left" ? { x: 1, y: 0.5 } : { x: 0, y: 0.5 };
  }

  return branch === "Left" ? { x: 0.5, y: 1 } : { x: 0.5, y: 0 };
};

const nodeThemes: Record<NodeCategory, NodeTheme> = {
  Executive: {
    fill: "#243B77",
    stroke: "#172554",
    category: "#D4DEFE",
    title: "#FFF",
  },
  Division: {
    fill: "#E8EFFF",
    stroke: "#6484DF",
    category: "#315AC5",
    title: "#17336F",
  },
  Team: {
    fill: "#E9F8F2",
    stroke: "#55AF8C",
    category: "#0F805E",
    title: "#10533F",
  },
  Capability: {
    fill: "#FFF5E4",
    stroke: "#DDA046",
    category: "#B8610B",
    title: "#713F12",
  },
};
const orientationOptions: SelectOption<Orientation>[] = [
  { text: "Top to bottom", value: "TopToBottom" },
  { text: "Bottom to top", value: "BottomToTop" },
  { text: "Left to right", value: "LeftToRight" },
  { text: "Right to left", value: "RightToLeft" },
];
const subtreeOptions: SubtreeOption[] = [
  {
    text: "Vertical alternate",
    value: "VerticalAlternate",
    orientation: "Vertical",
    type: "Alternate",
  },
  {
    text: "Vertical left",
    value: "VerticalLeft",
    orientation: "Vertical",
    type: "Left",
  },
  {
    text: "Vertical right",
    value: "VerticalRight",
    orientation: "Vertical",
    type: "Right",
  },
  {
    text: "Horizontal balanced",
    value: "HorizontalBalanced",
    orientation: "Horizontal",
    type: "Balanced",
  },
  {
    text: "Horizontal center",
    value: "HorizontalCenter",
    orientation: "Horizontal",
    type: "Center",
  },
  {
    text: "Horizontal left",
    value: "HorizontalLeft",
    orientation: "Horizontal",
    type: "Left",
  },
  {
    text: "Horizontal right",
    value: "HorizontalRight",
    orientation: "Horizontal",
    type: "Right",
  },
];
const mindMapOptions: SelectOption<MindMapOrientation>[] = [
  { text: "Horizontal", value: "Horizontal" },
  { text: "Vertical", value: "Vertical" },
];
const exportItems: Array<{
  text: string;
  id: DiagramExportFormat;
  iconCss: string;
}> = [
  { text: "Export as PNG", id: "PNG", iconCss: "e-icons e-image" },
  { text: "Export as JPEG", id: "JPG", iconCss: "e-icons e-image" },
  { text: "Export as SVG", id: "SVG", iconCss: "e-icons e-file-new" },
];
const layoutOptions: Array<{ type: LayoutType; label: string }> = [
  { type: "OrganizationalChart", label: "Organizational" },
  { type: "HierarchicalTree", label: "Hierarchical" },
  { type: "MindMap", label: "Mind Map" },
];
const propertyDropdownFields = { text: "text", value: "value" };
const getConnectorPropertiesForLayout = (layoutType: LayoutType) => ({
  constraints: ConnectorConstraints.Default & ~ConnectorConstraints.Select,
  type: layoutType === "MindMap" ? "Bezier" : "Orthogonal",
  cornerRadius:
    layoutType === "OrganizationalChart" || layoutType === "HierarchicalTree"
      ? 10
      : 0,
  style: {
    strokeColor: layoutType === "MindMap" ? "#667EB8" : "#8291AD",
    strokeWidth: layoutType === "MindMap" ? 2 : 1.7,
  },
  sourceDecorator: { shape: "None" },
  targetDecorator: {
    shape: layoutType === "MindMap" ? "None" : "Arrow",
    width: 8,
    height: 8,
    style: { fill: "#8291AD", strokeColor: "#8291AD" },
  },
});

export default function DiagramPage() {
  const diagramRef = useRef<DiagramComponent | null>(null);
  const diagramDataManager = useMemo(
    () => new DataManager(productHierarchy),
    [],
  );
  const [layoutType, setLayoutType] = useState<LayoutType>(
    "OrganizationalChart",
  );
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("Select");
  const [orientation, setOrientation] = useState<Orientation>("TopToBottom");
  const [subtreeOptionValue, setSubtreeOptionValue] =
    useState<SubtreeOptionValue>("VerticalLeft");
  const [mindMapOrientation, setMindMapOrientation] =
    useState<MindMapOrientation>("Horizontal");
  const [isOverviewVisible, setIsOverviewVisible] = useState(false);
  const [isDiagramReady, setIsDiagramReady] = useState(false);
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ProductNode>(
    productHierarchy[0],
  );

  const diagramElementId = "product-engineering-diagram";
  const overviewElementId = "product-engineering-overview";

  const subtreeLayoutSetting = useMemo(
    () =>
      subtreeOptions.find(
        (subtreeOption) => subtreeOption.value === subtreeOptionValue,
      ) || subtreeOptions[1],
    [subtreeOptionValue],
  );
  const getOrganizationalLayoutInfo = useCallback(
    (_diagramNode: NodeModel, layoutInfo: TreeInfo) => {
      if (!layoutInfo.hasSubTree) {
        layoutInfo.orientation = subtreeLayoutSetting.orientation;
        layoutInfo.type = subtreeLayoutSetting.type;
      }
    },
    [subtreeLayoutSetting],
  );
  const diagramLayout = useMemo<LayoutModel>(() => {
    const sharedLayoutOptions = {
      horizontalSpacing: 44,
      verticalSpacing: 64,
      enableAnimation: false,
      margin: { left: 45, right: 45, top: 45, bottom: 45 },
    };
    if (layoutType === "OrganizationalChart")
      return {
        ...sharedLayoutOptions,
        type: layoutType,
        orientation,
        getLayoutInfo: getOrganizationalLayoutInfo,
      };
    if (layoutType === "HierarchicalTree")
      return {
        ...sharedLayoutOptions,
        type: layoutType,
        orientation,
        horizontalSpacing: 40,
        verticalSpacing: 56,
        horizontalAlignment: "Center",
        verticalAlignment: "Center",
        bounds: new Rect(30, 30, 1350, 720),
      };
    return {
      ...sharedLayoutOptions,
      type: "MindMap",
      root: "engineering",
      orientation: mindMapOrientation,
      horizontalSpacing: 56,
      verticalSpacing: 56,
      getBranch: (diagramNode: NodeModel) => {
        const nodeData = diagramNode.data;

        if (!isProductNodeData(nodeData) || nodeData.id === "engineering") {
          return "Right";
        }

        return getProductNodeBranch(nodeData);
      },
    };
  }, [
    layoutType,
    orientation,
    getOrganizationalLayoutInfo,
    mindMapOrientation,
  ]);

  const fitDiagramToPage = useCallback(
    () =>
      diagramRef.current?.fitToPage({
        region: "Content",
        mode: "Page",
        canZoomIn: true,
        canZoomOut: true,
        margin: { left: 45, right: 45, top: 45, bottom: 45 },
      }),
    [],
  );
  const reapplyDiagramLayout = useCallback(() => {
    const diagram = diagramRef.current;
    if (!diagram?.nodes?.length) return;
    diagram.layout = { ...diagramLayout };
    diagram.dataBind();
    diagram.doLayout();
    window.requestAnimationFrame(fitDiagramToPage);
  }, [diagramLayout, fitDiagramToPage]);

  const setNodeDefaults = useCallback(
    (diagramNode: NodeModel) => {
      const nodeData = diagramNode.data;

      if (!isProductNodeData(nodeData)) {
        throw new TypeError("Diagram node data is invalid.");
      }

      const nodeTheme = nodeThemes[nodeData.category];
      const isRootNode = nodeData.id === "engineering";
      const isExecutiveNode = nodeData.category === "Executive";
      const isDivisionNode = nodeData.category === "Division";
      const isCapabilityNode = nodeData.category === "Capability";
      const toggleIconOffset =
        layoutType === "MindMap"
          ? getMindMapToggleOffset(nodeData, mindMapOrientation)
          : { x: 0.5, y: 1 };
      diagramNode.width =
        layoutType === "MindMap"
          ? isRootNode
            ? 220
            : 176
          : isExecutiveNode
            ? 232
            : isDivisionNode
              ? 210
              : isCapabilityNode
                ? 186
                : 200;
      diagramNode.height =
        layoutType === "MindMap"
          ? isRootNode
            ? 78
            : 62
          : isExecutiveNode
            ? 88
            : isDivisionNode
              ? 82
              : 76;
      diagramNode.shape = {
        type: "Basic",
        shape: "Rectangle",
        cornerRadius: isRootNode ? 16 : 12,
      };
      diagramNode.annotations = [
        {
          content: (nodeData.category || "").toUpperCase(),
          offset: { x: 0.5, y: 0.32 },
          style: {
            color: nodeTheme.category,
            fontSize: 10,
            bold: true,
            textAlign: "Center",
          },
        },
        {
          content: nodeData.name || "",
          offset: { x: 0.5, y: 0.68 },
          margin: { left: 10, right: 10 },
          style: {
            color: nodeTheme.title,
            fontSize: isExecutiveNode ? 16 : 14,
            bold: true,
            textWrapping: "Wrap",
            textOverflow: "Ellipsis",
            textAlign: "Center",
          },
        },
      ];
      diagramNode.style = {
        fill: nodeTheme.fill,
        strokeColor: nodeTheme.stroke,
        strokeWidth: isRootNode ? 2 : 1.5,
      };
      diagramNode.collapseIcon = {
        shape: "Plus",
        width: 20,
        height: 20,
        offset: toggleIconOffset,
        fill: "#17336F",
        borderColor: "#FFF",
        borderWidth: 1,
        iconColor: "#FFF",
      };
      diagramNode.expandIcon = {
        shape: "Minus",
        width: 20,
        height: 20,
        offset: toggleIconOffset,
        fill: "#FFF",
        borderColor: "#17336F",
        borderWidth: 1,
        iconColor: "#17336F",
      };
      return diagramNode;
    },
    [layoutType, mindMapOrientation],
  );
  useEffect(() => {
    const diagram = diagramRef.current;

    if (!diagram?.nodes.length) {
      return;
    }

    diagram.nodes.forEach((diagramNode) => {
      const nodeData = diagramNode.data;

      if (!isProductNodeData(nodeData)) {
        return;
      }

      const isMindMap = layoutType === "MindMap";
      const isRootNode = nodeData.id === "engineering";
      const isExecutiveNode = nodeData.category === "Executive";
      const isDivisionNode = nodeData.category === "Division";
      const isCapabilityNode = nodeData.category === "Capability";
      const toggleIconOffset = isMindMap
        ? getMindMapToggleOffset(nodeData, mindMapOrientation)
        : { x: 0.5, y: 1 };

      diagramNode.width = isMindMap
        ? isRootNode
          ? 220
          : 176
        : isExecutiveNode
          ? 232
          : isDivisionNode
            ? 210
            : isCapabilityNode
              ? 186
              : 200;
      diagramNode.height = isMindMap
        ? isRootNode
          ? 78
          : 62
        : isExecutiveNode
          ? 88
          : isDivisionNode
            ? 82
            : 76;

      if (diagramNode.collapseIcon) {
        diagramNode.collapseIcon.offset = toggleIconOffset;
      }

      if (diagramNode.expandIcon) {
        diagramNode.expandIcon.offset = toggleIconOffset;
      }
    });
    diagram.connectors.forEach((connector) => {
      const previousConnectorProperties = {
        constraints: connector.constraints,
        type: connector.type,
        cornerRadius: connector.cornerRadius,
        style: connector.style,
        sourceDecorator: connector.sourceDecorator,
        targetDecorator: connector.targetDecorator,
      };
      const nextConnectorProperties =
        getConnectorPropertiesForLayout(layoutType);

      Object.assign(connector, nextConnectorProperties);
      diagram.connectorPropertyChange(
        connector as Connector,
        previousConnectorProperties as Connector,
        nextConnectorProperties as Connector,
      );
    });
    reapplyDiagramLayout();
  }, [layoutType, reapplyDiagramLayout, setNodeDefaults]);
  const setConnectorDefaults = useCallback(
    (connector: ConnectorModel) => {
      Object.assign(connector, getConnectorPropertiesForLayout(layoutType));
      return connector;
    },
    [layoutType],
  );

  const selectedNodeDetails = useMemo(
    () => ({
      selected: selectedNode,
      parentNode: productHierarchy.find(
        (productNode) => productNode.id === selectedNode?.parentId,
      ),
      childNodes: productHierarchy.filter(
        (productNode) => productNode.parentId === selectedNode?.id,
      ),
    }),
    [selectedNode],
  );
  const revealNodeInDiagram = useCallback(
    (nodeData: ProductNode | string | null | undefined) => {
      const matchedProductNode =
        typeof nodeData === "string"
          ? productHierarchy.find(
              (productNode) => productNode.name === nodeData,
            )
          : productHierarchy.find(
              (productNode) =>
                productNode.id === nodeData?.id ||
                productNode.name === nodeData?.name,
            );

      const diagram = diagramRef.current;

      if (!diagram || !matchedProductNode) {
        return;
      }

      let parentNodeId = matchedProductNode.parentId;

      while (parentNodeId) {
        const ancestorNode = diagram.nodes.find(
          (diagramNode) => diagramNode.id === parentNodeId,
        );

        if (ancestorNode) {
          ancestorNode.isExpanded = true;
        }

        parentNodeId = productHierarchy.find(
          (productNode) => productNode.id === parentNodeId,
        )?.parentId;
      }

      diagram.dataBind();
      diagram.doLayout();

      window.setTimeout(() => {
        const diagramNode = diagram.nodes.find(
          (candidateNode) => candidateNode.id === matchedProductNode.id,
        );

        if (!diagramNode) {
          return;
        }

        diagram.clearSelection();
        diagram.select([diagramNode]);

        if (diagramNode.wrapper?.bounds) {
          diagram.bringIntoView(diagramNode.wrapper.bounds);
        }

        setSelectedNode(matchedProductNode);
        setIsPropertyPanelOpen(true);
      }, 180);
    },
    [],
  );

  const exportDiagramFile = (format: DiagramExportFormat) =>
    diagramRef.current?.exportDiagram({
      fileName: "product-engineering-structure",
      format,
      mode: "Download",
      region: "Content",
      margin: { left: 25, right: 25, top: 25, bottom: 25 },
    });
  const printDiagram = () =>
    diagramRef.current?.print({
      region: "Content",
      pageOrientation: "Landscape",
      stretch: "Meet",
      multiplePage: false,
    });
  const renderPropertyDropdown = <OptionValue extends string>(
    options: SelectOption<OptionValue>[],
    selectedValue: OptionValue,
    onValueChange: (value: OptionValue) => void,
  ) => (
    <DropDownListComponent
      dataSource={options}
      fields={propertyDropdownFields}
      value={selectedValue}
      cssClass="diagram-property-dropdown"
      change={(changeEventArgs) => {
        if (typeof changeEventArgs.value !== "string") {
          throw new TypeError(
            "Diagram property dropdown values must be strings.",
          );
        }

        const selectedOption = options.find(
          (option) => option.value === changeEventArgs.value,
        );

        if (!selectedOption) {
          throw new RangeError(
            "Diagram property dropdown value is not one of its options.",
          );
        }

        onValueChange(selectedOption.value);
      }}
    />
  );

  const changeLayout = (nextLayout: LayoutType) => {
    if (nextLayout === layoutType) {
      return;
    }

    setLayoutType(nextLayout);
  };

  const renderLayoutTabs = () => (
    <div className="layout-tabs">
      {layoutOptions.map(({ type: layoutValue, label: layoutLabel }) => (
        <ButtonComponent
          key={layoutValue}
          content={layoutLabel}
          cssClass={
            layoutType === layoutValue
              ? "layout-tab layout-tab-active"
              : "layout-tab"
          }
          onClick={() => changeLayout(layoutValue)}
        />
      ))}
    </div>
  );
  const renderInteractionTools = () => (
    <div className="interaction-tools">
      <ButtonComponent
        cssClass={
          interactionMode === "Select"
            ? "diagram-icon-button command-active"
            : "diagram-icon-button"
        }
        iconCss="e-icons e-mouse-pointer"
        onClick={() => setInteractionMode("Select")}
        title="Select"
      />
      <ButtonComponent
        cssClass={
          interactionMode === "Pan"
            ? "diagram-icon-button command-active"
            : "diagram-icon-button"
        }
        iconCss="e-icons e-pan"
        onClick={() => setInteractionMode("Pan")}
        title="Pan"
      />
      <span className="command-separator" />
      <ButtonComponent
        cssClass="diagram-icon-button"
        iconCss="e-icons e-zoom-in"
        onClick={() =>
          diagramRef.current?.zoomTo({ type: "ZoomIn", zoomFactor: 0.2 })
        }
      />
      <ButtonComponent
        cssClass="diagram-icon-button"
        iconCss="e-icons e-zoom-out"
        onClick={() =>
          diagramRef.current?.zoomTo({ type: "ZoomOut", zoomFactor: 0.2 })
        }
      />
      <ButtonComponent
        cssClass="diagram-command-button"
        iconCss="e-icons e-zoom-to-fit"
        content="Fit"
        onClick={fitDiagramToPage}
      />
      <ButtonComponent
        cssClass="diagram-command-button"
        iconCss="e-icons e-refresh"
        content="Re-layout"
        onClick={reapplyDiagramLayout}
      />
    </div>
  );
  const renderOutputTools = () => (
    <div className="output-tools">
      <DropDownButtonComponent
        cssClass="diagram-command-button"
        iconCss="e-icons e-export"
        content="Export"
        items={exportItems}
        select={(selectEventArgs) => exportDiagramFile(selectEventArgs.item.id)}
      />
      <ButtonComponent
        cssClass="diagram-command-button"
        iconCss="e-icons e-print"
        content="Print"
        onClick={printDiagram}
      />
    </div>
  );

  return (
    <div className="page">
      <PageHeader module={DIAGRAM_MODULE} />

      <div className="card diagram-showcase-card">
        <div className="diagram-page">
          <ToolbarComponent id="diagram-toolbar">
            <ItemsDirective>
              <ItemDirective template={renderLayoutTabs} />
              <ItemDirective type="Separator" />
              <ItemDirective template={renderInteractionTools} />
              <ItemDirective type="Separator" align="Right" />
              <ItemDirective template={renderOutputTools} align="Right" />
            </ItemsDirective>
          </ToolbarComponent>
          <section className="diagram-workspace">
            <div className="diagram-canvas">
              <DiagramComponent
                id={diagramElementId}
                ref={diagramRef}
                width="100%"
                height="100%"
                dataSourceSettings={{
                  id: "id",
                  parentId: "parentId",
                  dataSource: diagramDataManager,
                  root: "engineering",
                }}
                layout={diagramLayout}
                getNodeDefaults={setNodeDefaults}
                getConnectorDefaults={setConnectorDefaults}
                tool={
                  interactionMode === "Pan"
                    ? DiagramTools.ZoomPan
                    : DiagramTools.SingleSelect
                }
                snapSettings={{ constraints: SnapConstraints.None }}
                pageSettings={{
                  background: { color: "#FBFCFF" },
                  multiplePage: false,
                }}
                scrollSettings={{
                  scrollLimit: "Infinity",
                  canAutoScroll: true,
                }}
                click={(clickEventArgs: IClickEventArgs) => {
                  if (clickEventArgs.element instanceof Diagram) {
                    return;
                  }

                  const clickedNodeData =
                    "nodes" in clickEventArgs.element
                      ? clickEventArgs.element.nodes?.[0]?.data
                      : "data" in clickEventArgs.element
                        ? clickEventArgs.element.data
                        : undefined;

                  if (isProductNodeData(clickedNodeData)) {
                    const matchingProductNode = productHierarchy.find(
                      (productNode) => productNode.id === clickedNodeData.id,
                    );
                    setSelectedNode(matchingProductNode ?? clickedNodeData);
                  }
                }}
                dataLoaded={() => {
                  window.requestAnimationFrame(() => {
                    const diagram = diagramRef.current;

                    if (!diagram) {
                      return;
                    }

                    diagram.doLayout();
                    fitDiagramToPage();
                    setIsDiagramReady(true);
                  });
                }}
              >
                <Inject
                  services={[
                    DataBinding,
                    HierarchicalTree,
                    MindMap,
                    LayoutAnimation,
                    PrintAndExport,
                  ]}
                />
              </DiagramComponent>
              {isOverviewVisible && isDiagramReady && (
                <aside className="overview-panel">
                  <div className="overview-header">
                    <strong>Overview</strong>
                    <span>Drag the viewport to navigate</span>
                  </div>
                  <OverviewComponent
                    id={overviewElementId}
                    sourceID={diagramElementId}
                    width="230px"
                    height="135px"
                  />
                </aside>
              )}
            </div>
            <ButtonComponent
              cssClass="property-edge-button"
              iconCss={
                isPropertyPanelOpen
                  ? "e-icons e-chevron-right"
                  : "e-icons e-chevron-left"
              }
              onClick={() => setIsPropertyPanelOpen((isOpen) => !isOpen)}
              title={
                isPropertyPanelOpen ? "Hide properties" : "Show properties"
              }
            />
            <aside
              className={
                isPropertyPanelOpen
                  ? "property-panel property-panel-open"
                  : "property-panel"
              }
            >
              <div className="property-header">
                <span className="e-icons e-settings" />
                <div>
                  <strong>Diagram properties</strong>
                  <small>Layout settings and selected node</small>
                </div>
              </div>
              <div className="property-content">
                <section className="property-block">
                  <h2>Navigator</h2>
                  <div className="property-action-row">
                    <div>
                      <strong>Overview</strong>
                      <span>Show the diagram navigator</span>
                    </div>
                    <ButtonComponent
                      cssClass={
                        isOverviewVisible
                          ? "overview-toggle overview-toggle-active"
                          : "overview-toggle"
                      }
                      iconCss={
                        isOverviewVisible
                          ? "e-icons e-eye"
                          : "e-icons e-eye-slash"
                      }
                      content={isOverviewVisible ? "On" : "Off"}
                      onClick={() =>
                        setIsOverviewVisible((isVisible) => !isVisible)
                      }
                    />
                  </div>
                </section>
                {layoutType === "OrganizationalChart" && (
                  <section className="property-block">
                    <h2>Organizational layout</h2>
                    <div className="property-field">
                      <label>Orientation</label>
                      {renderPropertyDropdown(
                        orientationOptions,
                        orientation,
                        (value) => {
                          setOrientation(value);
                          window.requestAnimationFrame(fitDiagramToPage);
                        },
                      )}
                    </div>
                    <div className="property-field">
                      <label>Subtree alignment</label>
                      {renderPropertyDropdown(
                        subtreeOptions,
                        subtreeOptionValue,
                        setSubtreeOptionValue,
                      )}
                    </div>
                    <ButtonComponent
                      cssClass="apply-layout-button"
                      iconCss="e-icons e-refresh"
                      content="Apply layout"
                      onClick={reapplyDiagramLayout}
                    />
                  </section>
                )}
                {layoutType === "HierarchicalTree" && (
                  <section className="property-block">
                    <h2>Hierarchical layout</h2>
                    <div className="property-field">
                      <label>Orientation</label>
                      {renderPropertyDropdown(
                        orientationOptions,
                        orientation,
                        (value) => {
                          setOrientation(value);
                          window.requestAnimationFrame(fitDiagramToPage);
                        },
                      )}
                    </div>
                    <ButtonComponent
                      cssClass="apply-layout-button"
                      iconCss="e-icons e-refresh"
                      content="Apply layout"
                      onClick={reapplyDiagramLayout}
                    />
                  </section>
                )}
                {layoutType === "MindMap" && (
                  <section className="property-block">
                    <h2>Mind-map layout</h2>
                    <div className="property-field">
                      <label>Orientation</label>
                      {renderPropertyDropdown(
                        mindMapOptions,
                        mindMapOrientation,
                        setMindMapOrientation,
                      )}
                    </div>
                    <ButtonComponent
                      cssClass="apply-layout-button"
                      iconCss="e-icons e-refresh"
                      content="Apply layout"
                      onClick={reapplyDiagramLayout}
                    />
                  </section>
                )}
                {selectedNodeDetails.selected && (
                  <section className="property-block node-details">
                    <h2>Selected node</h2>
                    <div className="selected-node-heading">
                      <span>
                        {selectedNodeDetails.selected.category?.charAt(0)}
                      </span>
                      <div>
                        <strong>{selectedNodeDetails.selected.name}</strong>
                        <small>{selectedNodeDetails.selected.category}</small>
                      </div>
                    </div>
                    <div className="node-relation">
                      <label>Parent</label>
                      {selectedNodeDetails.parentNode ? (
                        <button
                          onClick={() =>
                            revealNodeInDiagram(selectedNodeDetails.parentNode)
                          }
                        >
                          <span className="e-icons e-chevron-up" />
                          {selectedNodeDetails.parentNode.name}
                        </button>
                      ) : (
                        <span className="relation-empty">Root node</span>
                      )}
                    </div>
                    <div className="node-relation">
                      <label>
                        Direct children ({selectedNodeDetails.childNodes.length}
                        )
                      </label>
                      {selectedNodeDetails.childNodes.length ? (
                        <div className="child-list">
                          {selectedNodeDetails.childNodes.map((childNode) => (
                            <button
                              key={childNode.id}
                              onClick={() => revealNodeInDiagram(childNode)}
                            >
                              <span className="e-icons e-chevron-right" />
                              {childNode.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="relation-empty">
                          No direct children
                        </span>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
