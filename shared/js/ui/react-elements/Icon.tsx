import * as React from "react";
import {LocalIcon} from "tc-shared/file/Icons";

export const IconRenderer = (props: {
    icon: string | LocalIcon;
    title?: string;
    className?: string;
}) => {
    if(!props.icon) {
        return <div className={"icon-container icon-empty " + props.className} title={props.title} />;
    } else if(typeof props.icon === "string") {
        return <div className={"icon " + props.icon + " " + props.className} title={props.title} />;
    } else if(props.icon instanceof LocalIcon) {
        return <LocalIconRenderer icon={props.icon} title={props.title} className={props.className} />;
    } else {
        throw "JQuery icons are not longer supported";
    }
}

export interface LoadedIconRenderer {
    icon: LocalIcon;
    title?: string;
    className?: string;
}

export class LocalIconRenderer extends React.Component<LoadedIconRenderer, {}> {
    private readonly callback_state_update;

    constructor(props) {
        super(props);

        this.callback_state_update = () => {
            const icon = this.props.icon;
            if(icon.status !== "destroyed")
                this.forceUpdate();
        };
    }

    render() {
        const icon = this.props.icon;
        if(!icon || icon.status === "empty" || icon.status === "destroyed")
            return <div key={"empty"} className={"icon-container icon-empty " + this.props.className} title={this.props.title} />;
        else if(icon.status === "loaded") {
            if(icon.icon_id >= 0 && icon.icon_id <= 1000) {
                if(icon.icon_id === 0)
                    return <div key={"loaded-empty"} className={"icon-container icon-empty"} title={this.props.title} />;
                return <div key={"loaded"} className={"icon_em client-group_" + icon.icon_id} />;
            }
            return <div key={"icon"} className={"icon-container " + this.props.className}><img style={{ maxWidth: "100%", maxHeight: "100%" }} src={icon.loaded_url} alt={this.props.title || ("icon " + icon.icon_id)} draggable={false} /></div>;
        } else if(icon.status === "loading")
            return <div key={"loading"} className={"icon-container " + this.props.className} title={this.props.title}><div className={"icon_loading"} /></div>;
        else if(icon.status === "error")
            return <div key={"error"} className={"icon client-warning " + this.props.className} title={icon.error_message || tr("Failed to load icon")} />;
    }

    componentDidMount(): void {
        this.props.icon?.status_change_callbacks.push(this.callback_state_update);
    }

    componentWillUnmount(): void {
        this.props.icon?.status_change_callbacks.remove(this.callback_state_update);
    }

    componentDidUpdate(prevProps: Readonly<LoadedIconRenderer>, prevState: Readonly<{}>, snapshot?: any): void {
        prevProps.icon?.status_change_callbacks.remove(this.callback_state_update);
        this.props.icon?.status_change_callbacks.push(this.callback_state_update);
    }
}