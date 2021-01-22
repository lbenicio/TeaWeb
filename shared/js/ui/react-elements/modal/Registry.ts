import {AbstractModal} from "../../../ui/react-elements/ModalDefinitions";
import {ModalConstructorArguments} from "tc-shared/ui/react-elements/modal/Definitions";

export interface RegisteredModal<T extends keyof ModalConstructorArguments> {
    modalId: T,
    classLoader: () => Promise<new (...args: ModalConstructorArguments[T]) => AbstractModal>,
    popoutSupported: boolean
}

const registeredModals: {
    [T in keyof ModalConstructorArguments]?: RegisteredModal<T>
} = {};

export function findRegisteredModal<T extends keyof ModalConstructorArguments>(name: T) : RegisteredModal<T> | undefined {
    return registeredModals[name] as any;
}

function registerModal<T extends keyof ModalConstructorArguments>(modal: RegisteredModal<T>) {
    registeredModals[modal.modalId] = modal as any;
}

registerModal({
    modalId: "video-viewer",
    classLoader: async () => await import("tc-shared/video-viewer/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "channel-edit",
    classLoader: async () => await import("tc-shared/ui/modal/channel-edit/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "conversation",
    classLoader: async () => await import("../../frames/side/PopoutConversationRenderer"),
    popoutSupported: true
});

registerModal({
    modalId: "css-editor",
    classLoader: async () => await import("tc-shared/ui/modal/css-editor/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "channel-tree",
    classLoader: async () => await import("tc-shared/ui/tree/popout/RendererModal"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-connect",
    classLoader: async () => await import("tc-shared/ui/modal/connect/Renderer"),
    popoutSupported: true
});
