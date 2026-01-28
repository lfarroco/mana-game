import { ServerFactory, getServerAdapter } from './ServerFactory';
import { LocalServerAdapter } from './LocalServerAdapter';
import { RemoteServerAdapter } from './RemoteServerAdapter';

describe('ServerFactory', () => {
	beforeEach(() => {
		// Reset factory before each test
		ServerFactory.reset();
	});

	describe('getServer', () => {
		it('should return LocalServerAdapter by default', () => {
			const server = ServerFactory.getServer();
			expect(server).toBeInstanceOf(LocalServerAdapter);
		});

		it('should return RemoteServerAdapter when multiplayer is enabled', () => {
			ServerFactory.setMultiplayer(true);
			const server = ServerFactory.getServer();
			expect(server).toBeInstanceOf(RemoteServerAdapter);
		});

		it('should return same instance on multiple calls', () => {
			const server1 = ServerFactory.getServer();
			const server2 = ServerFactory.getServer();
			expect(server1).toBe(server2);
		});
	});

	describe('setMultiplayer', () => {
		it('should switch from local to remote adapter', () => {
			const localServer = ServerFactory.getServer();
			expect(localServer).toBeInstanceOf(LocalServerAdapter);

			ServerFactory.setMultiplayer(true);
			const remoteServer = ServerFactory.getServer();
			expect(remoteServer).toBeInstanceOf(RemoteServerAdapter);
			expect(remoteServer).not.toBe(localServer);
		});

		it('should switch from remote to local adapter', () => {
			ServerFactory.setMultiplayer(true);
			const remoteServer = ServerFactory.getServer();
			expect(remoteServer).toBeInstanceOf(RemoteServerAdapter);

			ServerFactory.setMultiplayer(false);
			const localServer = ServerFactory.getServer();
			expect(localServer).toBeInstanceOf(LocalServerAdapter);
			expect(localServer).not.toBe(remoteServer);
		});

		it('should not recreate instance if mode unchanged', () => {
			const server1 = ServerFactory.getServer();
			ServerFactory.setMultiplayer(false); // Already false
			const server2 = ServerFactory.getServer();
			expect(server1).toBe(server2);
		});
	});

	describe('isInMultiplayerMode', () => {
		it('should return false by default', () => {
			expect(ServerFactory.isInMultiplayerMode()).toBe(false);
		});

		it('should return true after enabling multiplayer', () => {
			ServerFactory.setMultiplayer(true);
			expect(ServerFactory.isInMultiplayerMode()).toBe(true);
		});

		it('should return false after disabling multiplayer', () => {
			ServerFactory.setMultiplayer(true);
			ServerFactory.setMultiplayer(false);
			expect(ServerFactory.isInMultiplayerMode()).toBe(false);
		});
	});

	describe('reset', () => {
		it('should clear instance and reset to default mode', () => {
			ServerFactory.setMultiplayer(true);
			const remoteServer = ServerFactory.getServer();

			ServerFactory.reset();

			expect(ServerFactory.isInMultiplayerMode()).toBe(false);
			const newServer = ServerFactory.getServer();
			expect(newServer).toBeInstanceOf(LocalServerAdapter);
			expect(newServer).not.toBe(remoteServer);
		});
	});

	describe('getServerAdapter convenience function', () => {
		it('should return same result as ServerFactory.getServer()', () => {
			const fromFactory = ServerFactory.getServer();
			const fromFunction = getServerAdapter();
			expect(fromFunction).toBe(fromFactory);
		});
	});
});
